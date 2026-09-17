import { getStore } from "@netlify/blobs";

const STORE_NAME = "billet-doux";

export default async (req) => {
  const url = new URL(req.url);
  const slug = cleanSlug(url.searchParams.get("slug") || "");
  if (!slug) return json(400, { ok:false, error:"Missing slug" });

  // Chemin normal : aucune dépendance à Google pour lire un billet récent.
  try {
    const store = getStore(STORE_NAME);
    const stored = await store.get(`billets/${slug}`, { type:"json", consistency:"strong" });
    if (stored?.slug && stored?.message !== undefined) {
      return json(200, { ...stored, ok:true, source:"netlify" });
    }
  } catch (blobError) {
    console.error("Netlify Blob read failed", blobError);
  }

  // Fallback pour les billets créés avant la v1.16 : on les récupère une fois
  // chez Google puis on les rapatrie automatiquement dans Netlify Blobs.
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  if (!endpoint || !secret) return json(404, { ok:false, error:"Not found" });

  try {
    const data = await fetchGoogleBillet(endpoint, secret, slug);
    if (!data?.ok) return json(404, data || { ok:false, error:"Not found" });

    const billet = {
      ok:true,
      slug:String(data.slug || slug),
      card_id:String(data.card_id || ""),
      signature:String(data.signature || ""),
      message:String(data.message || ""),
      created_at:String(data.created_at || "")
    };

    try {
      const store = getStore(STORE_NAME);
      await store.setJSON(`billets/${slug}`, billet);
    } catch (blobError) {
      console.error("Backfill Blob write failed", blobError);
    }

    return json(200, { ...billet, source:"google-fallback" });
  } catch (e) {
    console.error("get-billet Google fallback exception", e);
    return json(404, { ok:false, error:"Not found" });
  }
};

async function fetchGoogleBillet(endpoint, secret, slug) {
  const target = `${endpoint}?action=get&slug=${encodeURIComponent(slug)}&secret=${encodeURIComponent(secret)}`;
  const r = await fetch(target, { redirect:"follow" });
  const raw = await r.text();
  try { return JSON.parse(raw); }
  catch (_) { throw new Error(`Apps Script returned non JSON (${r.status})`); }
}

function cleanSlug(value="") {
  return String(value).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,60);
}

const json=(status,obj)=>new Response(JSON.stringify(obj),{
  status,
  headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
