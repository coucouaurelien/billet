import { getStore } from "@netlify/blobs";

const STORE_NAME = "billet-doux";

export default async (req) => {
  if (req.method !== "POST") return json(405,{ok:false,error:"Method not allowed"});
  try{
    const body = await req.json();
    const slug = cleanSlug(body.slug || "");
    if(!slug) return json(400,{ok:false,error:"Missing slug"});
    const store = getStore(STORE_NAME);
    const key = `billets/${slug}`;
    const billet = await store.get(key,{type:"json",consistency:"strong"});
    if(!billet) return json(404,{ok:false,error:"Not found"});
    if(billet.consumed === true) return json(200,{ok:true,gone:true});

    // On conserve seulement ce qui est nécessaire pour reconnaître le billet comme consommé.
    // Le message et la signature disparaissent du stockage public.
    const tombstone = {
      slug,
      card_id:String(billet.card_id || ""),
      created_at:String(billet.created_at || ""),
      consumed:true,
      consumed_at:new Date().toISOString()
    };
    await store.setJSON(key,tombstone);
    const verified = await store.get(key,{type:"json",consistency:"strong"});
    if(!verified?.consumed) throw new Error("Consumption write not verified");
    return json(200,{ok:true,gone:true});
  }catch(err){
    console.error("consume-billet exception",err);
    return json(500,{ok:false,error:"Consume failed"});
  }
};

function cleanSlug(value=""){return String(value).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,60)}
const json=(status,obj)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
