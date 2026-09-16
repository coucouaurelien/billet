const BILLETS_SHEET = 'Billets';
const CORPUS_SHEET = 'Corpus';

const BILLETS_HEADERS = [
  'id','created_at','slug','slug_number','card_id','signature','message',
  'char_count','word_count','manual_line_count','visual_line_count','newline_count','emoji_count',
  'exclamation_count','question_count','ellipsis_count','composition_seconds',
  'reuse_artistic','reuse_consent_at','reuse_consent_version',
  'view_count','first_view_at','last_view_at',
  'reveal_count','first_reveal_at','last_reveal_at','seconds_to_first_reveal',
  'share_count','last_share_at','app_version'
];

const CORPUS_HEADERS = [
  'corpus_id','created_at','card_id','message',
  'char_count','word_count','manual_line_count','visual_line_count','newline_count','emoji_count',
  'exclamation_count','question_count','ellipsis_count','composition_seconds',
  'consent_version'
];


/**
 * À exécuter UNE FOIS manuellement depuis l'éditeur Apps Script.
 * Cette fonction mémorise l'ID du Google Sheet parent, crée les onglets
 * nécessaires et force la demande d'autorisation Google avant le déploiement.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Ouvre Apps Script depuis le Google Sheet (Extensions > Apps Script), puis relance setup().');
  PropertiesService.getScriptProperties().setProperty('BILLET_SPREADSHEET_ID', ss.getId());
  ensureSheet_(BILLETS_SHEET, BILLETS_HEADERS);
  ensureSheet_(CORPUS_SHEET, CORPUS_HEADERS);
  SpreadsheetApp.flush();
  return 'OK — Sheet relié : ' + ss.getName();
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('BILLET_SPREADSHEET_ID');
  if (savedId) {
    try { return SpreadsheetApp.openById(savedId); }
    catch (err) { throw new Error('Google Sheet inaccessible. Relance setup() dans Apps Script.'); }
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('BILLET_SPREADSHEET_ID', active.getId());
    return active;
  }
  throw new Error('Google Sheet non configuré. Exécute setup() une fois dans Apps Script.');
}

function doGet(e) {
  try {
    assertSecret_(e.parameter.secret);
    const action = (e.parameter.action || '');
    if (action === 'ping') {
      const ss = getSpreadsheet_();
      return out_({ok:true,service:'billet-sheet',sheet_ready:!!ss});
    }
    if (action !== 'get') return out_({ok:false,error:'Bad action'});
    const slug = cleanSlug_(e.parameter.slug || '');
    const row = findBySlug_(slug);
    if (!row) return out_({ok:false,error:'Not found'});
    return out_({
      ok:true,
      slug:row.slug,
      card_id:row.card_id,
      signature:row.signature,
      message:row.message,
      created_at:row.created_at
    });
  } catch (err) { return out_({ok:false,error:String(err.message || err)}); }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    assertSecret_(body.secret);
    if (body.action === 'create') return create_(body);
    if (body.action === 'event') return event_(body);
    return out_({ok:false,error:'Bad action'});
  } catch (err) { return out_({ok:false,error:String(err.message || err)}); }
}

function create_(body) {
  const message = String(body.message || '').trim().slice(0,170);
  const signature = String(body.signature || '').trim().slice(0,30);
  const cardId = String(body.card_id || '').trim().slice(0,80);
  if (!message) throw new Error('Message required');
  if (!signature) throw new Error('Signature required');
  if (!cardId) throw new Error('Card required');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = ensureSheet_(BILLETS_SHEET, BILLETS_HEADERS);
    ensureSheet_(CORPUS_SHEET, CORPUS_HEADERS);

    const slugBase = slugify_(signature) || 'billet';
    const used = slugSet_(sheet);
    let n = 1;
    let slug = slugBase;
    while (used.has(slug)) { n++; slug = slugBase + '-' + n; }

    const now = new Date();
    const nowIso = now.toISOString();
    const stats = stats_(message);
    const compositionSeconds = clampInt_(body.composition_seconds, 0, 3600);
    const visualLineCount = clampInt_(body.visual_line_count, 1, 4);
    const reuse = body.reuse_artistic === true;
    const consentVersion = String(body.reuse_consent_version || '').slice(0,40);

    const values = [
      Utilities.getUuid(), nowIso, slug, n, cardId, signature, message,
      stats.charCount, stats.wordCount, stats.lineCount, visualLineCount, stats.newlineCount, stats.emojiCount,
      stats.exclamationCount, stats.questionCount, stats.ellipsisCount, compositionSeconds,
      reuse, reuse ? nowIso : '', reuse ? consentVersion : '',
      0, '', '',
      0, '', '', '',
      0, '', String(body.app_version || '').slice(0,40)
    ];
    sheet.appendRow(values);

    if (reuse) {
      const corpus = ensureSheet_(CORPUS_SHEET, CORPUS_HEADERS);
      corpus.appendRow([
        Utilities.getUuid(), nowIso, cardId, message,
        stats.charCount, stats.wordCount, stats.lineCount, visualLineCount, stats.newlineCount, stats.emojiCount,
        stats.exclamationCount, stats.questionCount, stats.ellipsisCount, compositionSeconds,
        consentVersion
      ]);
    }

    return out_({ok:true,slug});
  } finally { lock.releaseLock(); }
}

function event_(body) {
  const slug = cleanSlug_(body.slug || '');
  const type = String(body.type || '');
  if (!['view','reveal','share'].includes(type)) throw new Error('Bad event');
  const sheet = ensureSheet_(BILLETS_SHEET, BILLETS_HEADERS);
  const map = headerMap_(sheet);
  const rowNum = findRowNumBySlug_(sheet, slug, map.slug);
  if (!rowNum) return out_({ok:false,error:'Not found'});
  const now = new Date();
  const nowIso = now.toISOString();

  if (type === 'view') {
    increment_(sheet, rowNum, map.view_count);
    if (!sheet.getRange(rowNum, map.first_view_at).getValue()) sheet.getRange(rowNum, map.first_view_at).setValue(nowIso);
    sheet.getRange(rowNum, map.last_view_at).setValue(nowIso);
  }

  if (type === 'reveal') {
    increment_(sheet, rowNum, map.reveal_count);
    const firstCell = sheet.getRange(rowNum, map.first_reveal_at);
    if (!firstCell.getValue()) {
      firstCell.setValue(nowIso);
      const created = sheet.getRange(rowNum, map.created_at).getValue();
      const createdMs = new Date(created).getTime();
      if (Number.isFinite(createdMs)) sheet.getRange(rowNum, map.seconds_to_first_reveal).setValue(Math.max(0, Math.round((now.getTime() - createdMs) / 1000)));
    }
    sheet.getRange(rowNum, map.last_reveal_at).setValue(nowIso);
  }

  if (type === 'share') {
    increment_(sheet, rowNum, map.share_count);
    sheet.getRange(rowNum, map.last_share_at).setValue(nowIso);
  }
  return out_({ok:true});
}

function stats_(message) {
  const lines = message.split(/\r?\n/);
  const emojiMatches = message.match(/[\p{Extended_Pictographic}]/gu) || [];
  return {
    charCount: Array.from(message).length,
    wordCount: (message.match(/\S+/g) || []).length,
    lineCount: Math.max(1, lines.length),
    newlineCount: Math.max(0, lines.length - 1),
    emojiCount: emojiMatches.length,
    exclamationCount: (message.match(/!/g) || []).length,
    questionCount: (message.match(/\?/g) || []).length,
    ellipsisCount: (message.match(/…|\.\.\./g) || []).length
  };
}

function ensureSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const current = sheet.getRange(1,1,1,headers.length).getValues()[0];
  if (current.join('|') !== headers.join('|')) sheet.getRange(1,1,1,headers.length).setValues([headers]);
  return sheet;
}

function headerMap_(sheet) {
  const heads = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const map = {}; heads.forEach((h,i)=>map[h]=i+1); return map;
}
function slugSet_(sheet) {
  if (sheet.getLastRow() < 2) return new Set();
  const map = headerMap_(sheet);
  const vals = sheet.getRange(2,map.slug,sheet.getLastRow()-1,1).getValues().flat();
  return new Set(vals.map(String));
}
function findBySlug_(slug) {
  const sheet = ensureSheet_(BILLETS_SHEET, BILLETS_HEADERS);
  const map = headerMap_(sheet);
  const rowNum = findRowNumBySlug_(sheet, slug, map.slug);
  if (!rowNum) return null;
  const row = sheet.getRange(rowNum,1,1,sheet.getLastColumn()).getValues()[0];
  const obj = {}; Object.keys(map).forEach(k=>obj[k]=row[map[k]-1]); return obj;
}
function findRowNumBySlug_(sheet, slug, slugCol) {
  if (!slug || sheet.getLastRow() < 2) return 0;
  const finder = sheet.getRange(2,slugCol,sheet.getLastRow()-1,1).createTextFinder(slug).matchEntireCell(true).findNext();
  return finder ? finder.getRow() : 0;
}
function increment_(sheet, rowNum, colNum) {
  const cell = sheet.getRange(rowNum, colNum);
  cell.setValue(Number(cell.getValue() || 0) + 1);
}
function clampInt_(value, min, max) {
  const n = Math.round(Number(value) || 0);
  return Math.max(min, Math.min(max, n));
}
function slugify_(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);
}
function cleanSlug_(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,60); }
function assertSecret_(received) {
  const expected = PropertiesService.getScriptProperties().getProperty('BILLET_API_SECRET');
  if (!expected || received !== expected) throw new Error('Unauthorized');
}
function out_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
