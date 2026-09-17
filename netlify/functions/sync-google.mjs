export default async (req) => {
  if (req.method !== "POST") throw new Error("Method not allowed");

  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  if (!endpoint || !secret) throw new Error("Google archive is not configured");

  const body = await req.json();
  const payload = {
    ...body,
    action:"archive",
    secret
  };

  const res = await fetch(endpoint, {
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify(payload),
    redirect:"follow"
  });

  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); }
  catch (_) { throw new Error(`Apps Script returned non JSON (${res.status})`); }

  if (!res.ok || !data?.ok) {
    throw new Error(String(data?.error || `Google archive failed (${res.status})`));
  }
};

export const config = {
  background:true
};
