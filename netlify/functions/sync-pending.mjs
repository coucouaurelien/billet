import { getStore } from "@netlify/blobs";
import { syncPayloadToGoogle } from "../lib/google-sync.mjs";

const STORE_NAME="billet-doux";

export default async ()=>{
  const store=getStore(STORE_NAME);
  let synced=0, failed=0;

  // 1) File persistante normale.
  const pending=await store.list({prefix:"archive/"});
  for(const item of pending.blobs.slice(0,40)){
    const payload=await store.get(item.key,{type:"json",consistency:"strong"});
    if(!payload) continue;
    const slug=cleanSlug(payload.slug || item.key.slice("archive/".length));
    try{
      await syncPayloadToGoogle(payload);
      await store.setJSON(`sync/${slug}`,{slug,synced_at:new Date().toISOString()});
      await store.delete(item.key);
      synced++;
    }catch(err){failed++;}
  }

  // 2) Rattrapage des billets créés pendant les versions précédentes où la
  // synchro Google était cassée. On ne peut récupérer que ceux qui n'ont pas
  // encore été consommés, car leur texte existe encore dans billets/.
  const billets=await store.list({prefix:"billets/"});
  for(const item of billets.blobs.slice(0,80)){
    if(synced>=40) break;
    const slug=cleanSlug(item.key.slice("billets/".length));
    const done=await store.get(`sync/${slug}`,{type:"json",consistency:"strong"});
    if(done) continue;
    const billet=await store.get(item.key,{type:"json",consistency:"strong"});
    if(!billet?.message || billet?.consumed) continue;
    const payload={
      request_id:String(billet.request_id || `backfill-${slug}`),
      slug,card_id:String(billet.card_id || ""),signature:String(billet.signature || ""),message:String(billet.message || ""),
      reuse_artistic:false,reuse_consent_version:"",composition_seconds:0,visual_line_count:1,app_version:"sv-backfill-1.23",created_at:String(billet.created_at || "")
    };
    try{
      await syncPayloadToGoogle(payload);
      await store.setJSON(`sync/${slug}`,{slug,synced_at:new Date().toISOString(),backfilled:true});
      synced++;
    }catch(err){failed++;}
  }
  await store.setJSON("system/last-google-sweep",{at:new Date().toISOString(),synced,failed});
};

export const config={schedule:"@hourly"};
function cleanSlug(value=""){return String(value).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,60)}
