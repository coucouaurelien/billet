export default async () => {
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;

  if (!endpoint || !secret) {
    return json(500, {
      ok:false,
      netlify:true,
      google_script_url:!!endpoint,
      billet_api_secret:!!secret,
      apps_script:false,
      error:"Variables Netlify incomplètes"
    });
  }

  try {
    const target = `${endpoint}?action=ping&secret=${encodeURIComponent(secret)}`;
    const r = await fetch(target, {redirect:"follow"});
    const raw = await r.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) {
      return json(502, {
        ok:false,
        netlify:true,
        google_script_url:true,
        billet_api_secret:true,
        apps_script:false,
        error:"Apps Script renvoie une page HTML au lieu de JSON. Vérifie l’URL /exec et l’accès 'Tout le monde'."
      });
    }

    return json(data.ok ? 200 : 502, {
      ok:!!data.ok,
      netlify:true,
      google_script_url:true,
      billet_api_secret:true,
      apps_script:!!data.ok,
      sheet_ready:!!data.sheet_ready,
      error:data.ok ? null : humanize(data.error)
    });
  } catch (e) {
    return json(502, {
      ok:false,
      netlify:true,
      google_script_url:true,
      billet_api_secret:true,
      apps_script:false,
      error:"Netlify n’arrive pas à joindre Apps Script"
    });
  }
};

function humanize(message="") {
  const m=String(message);
  if (/Unauthorized/i.test(m)) return "Le secret Netlify et le secret Apps Script ne correspondent pas";
  if (/setup\(\)|Sheet non configuré|Sheet inaccessible/i.test(m)) return "Le Google Sheet n’est pas initialisé. Exécute setup() dans Apps Script";
  return m || "Erreur Apps Script";
}

const json=(status,obj)=>new Response(JSON.stringify(obj),{
  status,
  headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
