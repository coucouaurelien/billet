export default async (req) => {
  if (req.method !== "POST") return json(405, { ok:false, error:"Method not allowed" });

  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  if (!endpoint) return json(500, { ok:false, error:"GOOGLE_SCRIPT_URL manque dans Netlify" });
  if (!secret) return json(500, { ok:false, error:"BILLET_API_SECRET manque dans Netlify" });

  try {
    const body = await req.json();
    const r = await fetch(endpoint, {
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({ ...body, action:"create", secret }),
      redirect:"follow"
    });

    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      console.error("Apps Script returned non JSON", r.status, raw.slice(0,500));
      return json(502, {
        ok:false,
        error:"Google n’a pas renvoyé une réponse exploitable. Réessaie dans quelques secondes."
      });
    }

    if (!data.ok) {
      console.error("Apps Script create error:", data.error || data);
      return json(400, { ok:false, error:humanize(data.error) });
    }

    return json(200, data);
  } catch (e) {
    console.error("create-billet exception:", e);
    return json(500, { ok:false, error:"Erreur serveur lors de la création du billet" });
  }
};

function humanize(message="") {
  const m = String(message);
  if (/Unauthorized/i.test(m)) return "Le secret Netlify et le secret Apps Script ne correspondent pas";
  if (/setup\(\)|Sheet non configuré|Sheet inaccessible/i.test(m)) return "Le Google Sheet n’est pas initialisé. Exécute setup() une fois dans Apps Script";
  if (/Busy/i.test(m)) return "Deux billets sont créés en même temps. Réessaie immédiatement.";
  if (/Message required/i.test(m)) return "Le message est vide";
  if (/Signature required/i.test(m)) return "La signature est vide";
  if (/Card required/i.test(m)) return "L’illustration n’a pas été reconnue";
  return m || "Création impossible";
}

const json=(status,obj)=>new Response(JSON.stringify(obj),{
  status,
  headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
