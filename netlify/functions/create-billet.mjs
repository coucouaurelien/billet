export default async (req) => {
  if (req.method !== "POST") return json(405, { ok:false, error:"Method not allowed" });
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  if (!endpoint || !secret) return json(500, { ok:false, error:"Backend not configured" });
  try {
    const body = await req.json();
    const r = await fetch(endpoint, {
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({ ...body, action:"create", secret })
    });
    const data = await r.json();
    return json(data.ok ? 200 : 400, data);
  } catch (e) {
    return json(500, { ok:false, error:"Server error" });
  }
};
const json=(status,obj)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
