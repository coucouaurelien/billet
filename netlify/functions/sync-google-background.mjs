import { getStore } from "@netlify/blobs";
import { syncPayloadToGoogle } from "../lib/google-sync.mjs";

const STORE_NAME="billet-doux";

export default async (req)=>{
  if(req.method!=="POST") throw new Error("Method not allowed");
  const {slug:rawSlug} = await req.json();
  const slug=cleanSlug(rawSlug || "");
  if(!slug) throw new Error("Missing slug");
  const store=getStore(STORE_NAME);
  const key=`archive/${slug}`;
  const payload=await store.get(key,{type:"json",consistency:"strong"});
  if(!payload) return; // déjà synchronisé ou rien à faire
  try{
    await syncPayloadToGoogle(payload);
    await store.setJSON(`sync/${slug}`,{slug,synced_at:new Date().toISOString()});
    await store.delete(key);
    await store.setJSON("system/last-google-sync",{ok:true,slug,at:new Date().toISOString()});
  }catch(err){
    await store.setJSON("system/last-google-sync",{ok:false,slug,at:new Date().toISOString(),error:String(err?.message || err)}).catch(()=>{});
    throw err; // Netlify Background Functions retentent automatiquement les erreurs
  }
};

function cleanSlug(value=""){return String(value).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,60)}

export const config={background:true};
