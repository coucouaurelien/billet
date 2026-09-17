export default async (req) => {
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  if (!endpoint || !secret) return json(500, { ok:false, error:"Backend not configured" });
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  if (!slug) return json(400, { ok:false, error:"Missing slug" });
  try {
    const target = `${endpoint}?action=get&slug=${encodeURIComponent(slug)}&secret=${encodeURIComponent(secret)}`;
    const r = await fetch(target, { redirect:"follow" });
    const data = await r.json();
    return json(data.ok ? 200 : 404, data);
  } catch (e) {
    return json(500, { ok:false, error:"Server error" });
  }
};
const json=(status,obj)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
