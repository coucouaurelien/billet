export default async (req) => {
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  if (!endpoint || !secret) return json(500, { ok:false, error:"Backend not configured" });
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  if (!slug) return json(400, { ok:false, error:"Missing slug" });

  try {
    let data = await fetchBillet(endpoint, secret, slug);

    // Sur une création toute fraîche, on tolère une micro-latence Google.
    if (!data?.ok && /not found/i.test(String(data?.error || ""))) {
      await delay(350);
      data = await fetchBillet(endpoint, secret, slug);
    }

    return json(data?.ok ? 200 : 404, data || { ok:false, error:"Not found" });
  } catch (e) {
    console.error("get-billet exception", e);
    return json(500, { ok:false, error:"Server error" });
  }
};

async function fetchBillet(endpoint, secret, slug) {
  const target = `${endpoint}?action=get&slug=${encodeURIComponent(slug)}&secret=${encodeURIComponent(secret)}`;
  const r = await fetch(target, { redirect:"follow" });
  const raw = await r.text();
  try { return JSON.parse(raw); }
  catch (_) { throw new Error(`Apps Script returned non JSON (${r.status})`); }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const json=(status,obj)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
