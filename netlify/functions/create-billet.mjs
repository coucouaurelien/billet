import { getStore } from "@netlify/blobs";

const STORE_NAME = "billet-doux";

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { ok:false, error:"Method not allowed" });

  try {
    const body = await req.json();
    const message = String(body.message || "").trim().slice(0,170);
    const signature = String(body.signature || "").trim().slice(0,30);
    const cardId = String(body.card_id || "").trim().slice(0,80);
    const requestId = String(body.request_id || "").trim().slice(0,100);

    if (!message) return json(400, { ok:false, error:"Le message est vide" });
    if (!signature) return json(400, { ok:false, error:"La signature est vide" });
    if (!cardId) return json(400, { ok:false, error:"L’illustration n’a pas été reconnue" });

    const store = getStore(STORE_NAME);

    // Idempotence : si le navigateur renvoie la même requête, on rend le même billet.
    if (requestId) {
      try {
        const replay = await store.get(`requests/${requestId}`, { type:"json", consistency:"strong" });
        if (replay?.slug) {
          const previous = await store.get(`billets/${replay.slug}`, { type:"json", consistency:"strong" });
          if (previous?.slug) return json(200, { ...previous, ok:true, replay:true });
        }
      } catch (_) {}
    }

    const nowIso = new Date().toISOString();
    const base = slugify(signature) || "billet";
    const core = {
      ok:true,
      card_id:cardId,
      signature,
      message,
      created_at:nowIso
    };

    // Netlify attribue le slug et persiste le billet AVANT toute opération Google.
    // onlyIfNew rend la réservation atomique, même pour deux créations simultanées.
    const billet = await reserveBillet(store, base, core);

    if (requestId) {
      try {
        await store.setJSON(`requests/${requestId}`, { slug:billet.slug, created_at:nowIso }, { onlyIfNew:true });
      } catch (_) {}
    }

    // Google devient une archive secondaire : déclenchée après la réponse utilisateur.
    // Le background endpoint répond tout de suite en 202 puis Netlify effectue la synchro.
    if (process.env.GOOGLE_SCRIPT_URL && process.env.BILLET_API_SECRET) {
      const archivePayload = {
        request_id: requestId || `netlify-${billet.slug}-${Date.now()}`,
        slug: billet.slug,
        card_id: cardId,
        signature,
        message,
        reuse_artistic: body.reuse_artistic === true,
        reuse_consent_version: String(body.reuse_consent_version || "").slice(0,60),
        composition_seconds: clampInt(body.composition_seconds, 0, 3600),
        visual_line_count: clampInt(body.visual_line_count, 1, 4),
        app_version: String(body.app_version || "sv-1.17").slice(0,40)
      };
      const syncUrl = new URL("/.netlify/functions/sync-google", context?.site?.url || req.url);
      context?.waitUntil?.(triggerArchive(syncUrl.toString(), archivePayload));
    }

    return json(200, billet);
  } catch (e) {
    console.error("create-billet exception:", e);
    return json(500, { ok:false, error:"Impossible de créer le billet pour le moment" });
  }
};

async function reserveBillet(store, base, core) {
  for (let n = 1; n <= 9999; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const billet = { ...core, slug, slug_number:n };
    const result = await store.setJSON(`billets/${slug}`, billet, { onlyIfNew:true });
    if (result?.modified) return billet;
  }
  throw new Error("Slug allocation exhausted");
}

async function triggerArchive(url, payload) {
  try {
    const res = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if (!res.ok && res.status !== 202) {
      console.error("Google archive trigger failed", res.status, await res.text().catch(()=>""));
    }
  } catch (err) {
    console.error("Google archive trigger exception", err);
  }
}

function slugify(value="") {
  return String(value)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0,50);
}

function clampInt(value, min, max) {
  const n = Math.round(Number(value) || 0);
  return Math.max(min, Math.min(max, n));
}

const json=(status,obj)=>new Response(JSON.stringify(obj),{
  status,
  headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
