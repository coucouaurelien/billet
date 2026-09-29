import { randomInt } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "billet-doux";

export default async (req) => {
  if (req.method !== "POST") return json(405,{ok:false,error:"Method not allowed"});
  try{
    const body = await req.json().catch(()=>({}));
    const requestId = String(body.request_id || "").trim().slice(0,100);
    if(!requestId) return json(400,{ok:false,error:"Missing request id"});
    const store = getStore(STORE_NAME);

    const replay = await store.get(`reservation-requests/${requestId}`,{type:"json",consistency:"strong"}).catch(()=>null);
    if(replay?.slug) return json(200,{ok:true,slug:replay.slug,replay:true});

    for(let attempt=0; attempt<100; attempt++){
      const slug=String(randomInt(0,1000000)).padStart(6,"0");
      const billet = await store.get(`billets/${slug}`,{type:"json",consistency:"strong"}).catch(()=>null);
      if(billet) continue;
      const reservation = await store.get(`reservations/${slug}`,{type:"json",consistency:"strong"}).catch(()=>null);
      if(reservation) continue;

      const value={slug,request_id:requestId,created_at:new Date().toISOString()};
      const write=await store.setJSON(`reservations/${slug}`,value);
      if(!write?.etag) continue;
      const verified=await store.get(`reservations/${slug}`,{type:"json",consistency:"strong"}).catch(()=>null);
      if(verified?.slug===slug && verified?.request_id===requestId){
        await store.setJSON(`reservation-requests/${requestId}`,{slug,created_at:value.created_at}).catch(()=>{});
        return json(200,{ok:true,slug});
      }
    }
    return json(503,{ok:false,error:"Impossible de réserver un code"});
  }catch(err){
    console.error("reserve-billet exception",err);
    return json(500,{ok:false,error:"Impossible de préparer le billet"});
  }
};

const json=(status,obj)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
