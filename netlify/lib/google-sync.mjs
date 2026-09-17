export async function syncPayloadToGoogle(payload){
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  if(!endpoint || !secret) throw new Error("Google archive is not configured");

  const base = {...payload, secret};
  let result = await post(endpoint,{...base,action:"archive"});
  // Compatibilité avec un déploiement Apps Script plus ancien : s'il ne connaît
  // pas encore `archive`, on retombe sur create avec le slug imposé.
  if(!result.ok && /Bad action/i.test(String(result.error || ""))){
    result = await post(endpoint,{...base,action:"create",slug_override:String(payload.slug || "")});
  }
  if(!result.ok) throw new Error(String(result.error || "Google archive failed"));
  return result;
}

async function post(endpoint,payload){
  const res = await fetch(endpoint,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify(payload),
    redirect:"follow"
  });
  const raw = await res.text();
  let data;
  try{data=JSON.parse(raw)}catch(_){throw new Error(`Apps Script returned non JSON (${res.status})`)}
  if(!res.ok) return {ok:false,error:data?.error || `Google HTTP ${res.status}`};
  return data || {ok:false,error:"Empty Google response"};
}
