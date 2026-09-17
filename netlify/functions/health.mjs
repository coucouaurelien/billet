import { getStore } from "@netlify/blobs";

export default async () => {
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;

  let blobs = false;
  let blobError = null;
  try {
    const store = getStore("billet-doux");
    const key = `health/${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const value = { ok:true, stamp:new Date().toISOString() };
    const write = await store.setJSON(key, value);
    const read = await store.get(key, { type:"json", consistency:"strong" });
    blobs = !!write?.etag && read?.ok === true && read?.stamp === value.stamp;
    await store.delete(key).catch(()=>{});
    if (!blobs) blobError = "Écriture/relecture Netlify Blobs non vérifiée";
  } catch (e) {
    blobError = String(e?.message || e || "Erreur Blobs");
  }

  let appsScript = false;
  let sheetReady = false;
  let googleError = null;
  if (endpoint && secret) {
    try {
      const target = `${endpoint}?action=ping&secret=${encodeURIComponent(secret)}`;
      const r = await fetch(target, {redirect:"follow"});
      const raw = await r.text();
      const data = JSON.parse(raw);
      appsScript = !!data.ok;
      sheetReady = !!data.sheet_ready;
      if (!data.ok) googleError = humanize(data.error);
    } catch (e) {
      googleError = "Apps Script indisponible ou réponse invalide";
    }
  } else {
    googleError = "Variables Google incomplètes";
  }

  return json(blobs ? 200 : 502, {
    ok:blobs,
    netlify:true,
    blobs,
    blobs_error:blobError,
    google_script_url:!!endpoint,
    billet_api_secret:!!secret,
    apps_script:appsScript,
    sheet_ready:sheetReady,
    google_error:googleError
  });
};

function humanize(message="") {
  const m=String(message);
  if (/Unauthorized/i.test(m)) return "Le secret Netlify et le secret Apps Script ne correspondent pas";
  if (/setup\(\)|Sheet non configuré|Sheet inaccessible/i.test(m)) return "Le Google Sheet n’est pas initialisé";
  return m || "Erreur Apps Script";
}

const json=(status,obj)=>new Response(JSON.stringify(obj),{
  status,
  headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
