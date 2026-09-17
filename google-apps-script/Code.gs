const BILLETS_SHEET = 'Billets';
const CORPUS_SHEET = 'Corpus';
let SPREADSHEET_CACHE_ = null;

// Colonnes réellement utilisées par l'app.
// Leur ORDRE N'A PLUS D'IMPORTANCE : le script les retrouve par leur nom.
const BILLETS_HEADERS = [
  'id','created_at','slug','slug_number','card_id','signature','message',
  'char_count','word_count','manual_line_count','visual_line_count','newline_count','emoji_count',
  'exclamation_count','question_count','ellipsis_count','composition_seconds',
  'reuse_artistic','reuse_consent_at','reuse_consent_version','app_version'
];

const CORPUS_HEADERS = [
  'corpus_id','created_at','card_id','message',
  'char_count','word_count','manual_line_count','visual_line_count','newline_count','emoji_count',
  'exclamation_count','question_count','ellipsis_count','composition_seconds',
  'consent_version'
];

// Anciennes colonnes de tracking qu'on ne veut plus conserver.
const LEGACY_TRACKING_HEADERS = [
  'view_count','first_view_at','last_view_at',
  'reveal_count','first_reveal_at','last_reveal_at','seconds_to_first_reveal',
  'share_count','last_share_at'
];

/**
 * À exécuter une fois après avoir collé cette nouvelle version.
 * - relie le bon Sheet
 * - ajoute les colonnes manquantes sans réordonner les tiennes
 * - supprime les anciennes colonnes d'ouverture / reveal / share
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Ouvre Apps Script depuis le Google Sheet (Extensions > Apps Script), puis relance setup().');

  PropertiesService.getScriptProperties().setProperty('BILLET_SPREADSHEET_ID', ss.getId());

  const billets = ensureSheetColumns_(BILLETS_SHEET, BILLETS_HEADERS);
  ensureSheetColumns_(CORPUS_SHEET, CORPUS_HEADERS);
  removeColumnsByHeader_(billets, LEGACY_TRACKING_HEADERS);

  SpreadsheetApp.flush();
  return 'OK — Billet Doux v1.15 relié à : ' + ss.getName();
}

function getSpreadsheet_() {
  if (SPREADSHEET_CACHE_) return SPREADSHEET_CACHE_;
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('BILLET_SPREADSHEET_ID');
  if (savedId) {
    try { SPREADSHEET_CACHE_ = SpreadsheetApp.openById(savedId); return SPREADSHEET_CACHE_; }
    catch (err) { throw new Error('Google Sheet inaccessible. Relance setup() dans Apps Script.'); }
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('BILLET_SPREADSHEET_ID', active.getId());
    SPREADSHEET_CACHE_ = active;
    return SPREADSHEET_CACHE_;
  }

  throw new Error('Google Sheet non configuré. Exécute setup() une fois dans Apps Script.');
}

function doGet(e) {
  try {
    assertSecret_(e.parameter.secret);
    const action = String(e.parameter.action || '');

    if (action === 'ping') {
      return out_({ok:true, service:'billet-sheet', sheet_ready:true, version:'1.15'});
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
  } catch (err) {
    return out_({ok:false,error:String(err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    assertSecret_(body.secret);

    if (body.action === 'create') return create_(body);

    // Compatibilité avec une ancienne version du front : on ignore désormais
    // les événements d'ouverture au lieu de toucher au Sheet.
    if (body.action === 'event') return out_({ok:true, ignored:true});

    return out_({ok:false,error:'Bad action'});
  } catch (err) {
    return out_({ok:false,error:String(err.message || err)});
  }
}

function create_(body) {
  const message = String(body.message || '').trim().slice(0,170);
  const signature = String(body.signature || '').trim().slice(0,30);
  const cardId = String(body.card_id || '').trim().slice(0,80);

  if (!message) throw new Error('Message required');
  if (!signature) throw new Error('Signature required');
  if (!cardId) throw new Error('Card required');

  const requestId = String(body.request_id || '').trim().slice(0,100);
  const props = PropertiesService.getScriptProperties();
  const requestKey = requestId ? 'CREATE_REQ__' + requestId : '';
  if (requestKey) {
    const previousSlug = props.getProperty(requestKey);
    if (previousSlug) return out_({ok:true, slug:previousSlug, replay:true});
  }

  // Très court verrou uniquement pour garantir un slug unique en cas de deux
  // créations simultanées. On ne bloque plus jusqu'à 10 secondes.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(2500)) throw new Error('Busy — retry');

  try {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(BILLETS_SHEET);
    const corpus = ss.getSheetByName(CORPUS_SHEET);
    if (!sheet || !corpus) throw new Error('Sheet non configuré. Relance setup().');

    const slugBase = slugify_(signature) || 'billet';
    const next = nextSlug_(sheet, slugBase);
    const slug = next.slug;
    const n = next.number;

    const nowIso = new Date().toISOString();
    const stats = stats_(message);
    const compositionSeconds = clampInt_(body.composition_seconds, 0, 3600);
    const visualLineCount = clampInt_(body.visual_line_count, 1, 4);
    const reuse = body.reuse_artistic === true;
    const consentVersion = String(body.reuse_consent_version || '').slice(0,60);

    const billet = {
      id: Utilities.getUuid(),
      created_at: nowIso,
      slug,
      slug_number: n,
      card_id: cardId,
      signature,
      message,
      char_count: stats.charCount,
      word_count: stats.wordCount,
      manual_line_count: stats.lineCount,
      visual_line_count: visualLineCount,
      newline_count: stats.newlineCount,
      emoji_count: stats.emojiCount,
      exclamation_count: stats.exclamationCount,
      question_count: stats.questionCount,
      ellipsis_count: stats.ellipsisCount,
      composition_seconds: compositionSeconds,
      reuse_artistic: reuse,
      reuse_consent_at: reuse ? nowIso : '',
      reuse_consent_version: reuse ? consentVersion : '',
      app_version: String(body.app_version || '').slice(0,40)
    };

    // Écriture principale. On mémorise immédiatement la ligne du slug pour
    // qu'une ouverture juste après la création ne dépende d'aucun scan.
    const billetRow = appendObject_(sheet, billet);
    SpreadsheetApp.flush();
    props.setProperty('SLUG_ROW__' + slug, String(billetRow));

    // Le corpus est utile pour l'analyse artistique, mais il ne doit jamais
    // rendre un billet introuvable si cette écriture secondaire rencontre un souci.
    if (reuse) {
      try {
        appendObject_(corpus, {
          corpus_id: Utilities.getUuid(),
          created_at: nowIso,
          card_id: cardId,
          message,
          char_count: stats.charCount,
          word_count: stats.wordCount,
          manual_line_count: stats.lineCount,
          visual_line_count: visualLineCount,
          newline_count: stats.newlineCount,
          emoji_count: stats.emojiCount,
          exclamation_count: stats.exclamationCount,
          question_count: stats.questionCount,
          ellipsis_count: stats.ellipsisCount,
          composition_seconds: compositionSeconds,
          consent_version: consentVersion
        });
      } catch (_) {}
    }

    const payload = {
      slug,
      card_id: cardId,
      signature,
      message,
      created_at: nowIso
    };

    // Cache très rapide pour les ouvertures récentes.
    try {
      CacheService.getScriptCache().put('billet:' + slug, JSON.stringify(payload), 21600);
    } catch (_) {}

    if (requestKey) props.setProperty(requestKey, slug);
    return out_({ok:true,...payload});
  } finally {
    lock.releaseLock();
  }
}

function nextSlug_(sheet, slugBase) {
  const props = PropertiesService.getScriptProperties();
  const key = 'SLUG_NEXT__' + slugBase;
  const saved = Number(props.getProperty(key) || 0);
  let n;

  // Si le compteur existe, aucune lecture du Sheet n'est nécessaire.
  if (Number.isFinite(saved) && saved >= 1) {
    n = saved;
  } else {
    // Compatibilité avec les billets déjà créés avant les compteurs :
    // une seule synchronisation pour ce prénom, puis plus aucun scan.
    n = inferNextSlugNumber_(sheet, slugBase);
  }

  const slug = n === 1 ? slugBase : slugBase + '-' + n;
  props.setProperty(key, String(n + 1));
  return {slug, number:n};
}

function inferNextSlugNumber_(sheet, slugBase) {
  const map = headerMap_(sheet);
  const slugCol = map.slug;
  const lastRow = sheet.getLastRow();
  if (!slugCol || lastRow < 2) return 1;

  const values = sheet.getRange(2, slugCol, lastRow - 1, 1).getDisplayValues().flat();
  let max = 0;
  const escaped = escapeRegExp_(slugBase);
  const rx = new RegExp('^' + escaped + '(?:-(\\d+))?$');

  values.forEach(value => {
    const m = String(value || '').match(rx);
    if (!m) return;
    const num = m[1] ? Number(m[1]) : 1;
    if (Number.isFinite(num)) max = Math.max(max, num);
  });

  return max + 1;
}

function findBySlug_(slug) {
  if (!slug) return null;

  try {
    const cached = CacheService.getScriptCache().get('billet:' + slug);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  const sheet = ensureSheetColumns_(BILLETS_SHEET, BILLETS_HEADERS);
  const map = headerMap_(sheet);
  const props = PropertiesService.getScriptProperties();
  const rowKey = 'SLUG_ROW__' + slug;
  const rememberedRow = Number(props.getProperty(rowKey) || 0);

  // Chemin rapide : la création mémorise directement le numéro de ligne.
  // On vérifie tout de même le slug, car un tri manuel peut déplacer les lignes.
  if (rememberedRow >= 2 && rememberedRow <= sheet.getLastRow()) {
    const remembered = sheet.getRange(rememberedRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rememberedSlug = map.slug ? String(remembered[map.slug - 1] || '') : '';
    if (rememberedSlug === slug) {
      const obj = rowToObject_(remembered, map);
      cacheBillet_(slug, obj);
      return obj;
    }
  }

  // Fallback pour les anciens billets ou après un tri manuel du tableau.
  const rowNum = findRowNumBySlug_(sheet, slug, map.slug);
  if (!rowNum) return null;

  const row = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  const obj = rowToObject_(row, map);
  props.setProperty(rowKey, String(rowNum));
  cacheBillet_(slug, obj);
  return obj;
}

function rowToObject_(row, map) {
  const obj = {};
  Object.keys(map).forEach(key => obj[key] = row[map[key] - 1]);
  return obj;
}

function cacheBillet_(slug, obj) {
  try {
    CacheService.getScriptCache().put('billet:' + slug, JSON.stringify({
      slug: obj.slug,
      card_id: obj.card_id,
      signature: obj.signature,
      message: obj.message,
      created_at: obj.created_at
    }), 21600);
  } catch (_) {}
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

/**
 * Ajoute uniquement les colonnes manquantes à droite.
 * Ne réordonne jamais les colonnes existantes.
 */
function ensureSheetColumns_(name, requiredHeaders) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return sheet;
  }

  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const missing = requiredHeaders.filter(header => !existing.includes(header));
  if (missing.length) {
    const start = sheet.getLastColumn() + 1;
    sheet.getRange(1, start, 1, missing.length).setValues([missing]);
  }

  return sheet;
}

function appendObject_(sheet, obj) {
  const map = headerMap_(sheet);
  const width = sheet.getLastColumn();
  const row = new Array(width).fill('');

  Object.keys(obj).forEach(key => {
    const col = map[key];
    if (col) row[col - 1] = obj[key];
  });

  const rowNum = sheet.getLastRow() + 1;
  sheet.getRange(rowNum, 1, 1, width).setValues([row]);
  return rowNum;
}

function removeColumnsByHeader_(sheet, headers) {
  if (!sheet || sheet.getLastColumn() < 1) return;
  const current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const positions = [];
  current.forEach((header, index) => {
    if (headers.includes(header)) positions.push(index + 1);
  });

  // Suppression de droite à gauche pour ne pas décaler les index restants.
  positions.sort((a,b) => b-a).forEach(col => sheet.deleteColumn(col));
}

function headerMap_(sheet) {
  const heads = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const map = {};
  heads.forEach((head, i) => {
    const key = String(head || '').trim();
    if (key && !map[key]) map[key] = i + 1;
  });
  return map;
}

function findRowNumBySlug_(sheet, slug, slugCol) {
  if (!slug || !slugCol || sheet.getLastRow() < 2) return 0;
  const finder = sheet
    .getRange(2, slugCol, sheet.getLastRow() - 1, 1)
    .createTextFinder(slug)
    .matchEntireCell(true)
    .findNext();
  return finder ? finder.getRow() : 0;
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

function cleanSlug_(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,60);
}

function escapeRegExp_(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertSecret_(received) {
  const expected = PropertiesService.getScriptProperties().getProperty('BILLET_API_SECRET');
  if (!expected || received !== expected) throw new Error('Unauthorized');
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
