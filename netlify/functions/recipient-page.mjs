import { getStore } from "@netlify/blobs";

const STORE_NAME = "billet-doux";

export default async (req) => {
  const url = new URL(req.url);
  const slug = cleanSlug(url.searchParams.get("slug") || "");
  const origin = url.origin;
  const canonical = `${origin}/${encodeURIComponent(slug)}`;
  const letter = initialKey(slug);
  const image = `${origin}/assets/og/initial-${letter}.jpg?v=113`;
  const previewTitle = "J’ai un petit mot pour toi...";

  // IMPORTANT : le billet est lu directement ici, dans le même store Netlify.
  // Aucun aller-retour client -> /api/billet n'est nécessaire pour les billets récents.
  let billet = null;
  if (slug) {
    try {
      const store = getStore(STORE_NAME);
      billet = await store.get(`billets/${slug}`, { type:"json", consistency:"strong" });
      if (!billet?.slug || billet?.message === undefined) billet = null;
    } catch (err) {
      console.error("recipient-page Blob read failed", err);
    }
  }

  const preloaded = billet ? `<script>window.SV_PRELOADED_BILLET=${safeJson({
    ok:true,
    slug:String(billet.slug || slug),
    card_id:String(billet.card_id || ""),
    signature:String(billet.signature || ""),
    message:String(billet.message || "")
  })};</script>` : "";

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#050505">
  <title>${escapeAttr(previewTitle)}</title>
  <meta name="description" content="">
  <meta property="og:title" content="${escapeAttr(previewTitle)}">
  <meta property="og:description" content="">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:image" content="${escapeAttr(image)}">
  <meta property="og:image:secure_url" content="${escapeAttr(image)}">
  <meta property="og:image:url" content="${escapeAttr(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="${escapeAttr(previewTitle)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(previewTitle)}">
  <meta name="twitter:description" content="">
  <meta name="twitter:image" content="${escapeAttr(image)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="preload" href="/assets/fonts/Coucouaurelien-V2-Regular.otf" as="font" type="font/otf" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  ${preloaded}
</head>
<body>
  <main id="app" class="app" aria-live="polite"></main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script src="/cards.generated.js"></script>
  <script src="/config.js"></script>
  <script src="/app.js?v=119" defer></script>
</body>
</html>`;

  // La page contient potentiellement un message privé : aucun cache partagé/CDN.
  return new Response(html,{status:200,headers:{
    "Content-Type":"text/html; charset=utf-8",
    "Cache-Control":"private, no-store, max-age=0",
    "Pragma":"no-cache"
  }});
};

function cleanSlug(value="") {
  return String(value).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,60);
}

function initialKey(value=""){
  const normalized = String(value).trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const match = normalized.match(/[A-Z]/);
  return match ? match[0] : "OTHER";
}

function safeJson(value){
  return JSON.stringify(value)
    .replace(/</g,"\\u003c")
    .replace(/>/g,"\\u003e")
    .replace(/&/g,"\\u0026")
    .replace(/\u2028/g,"\\u2028")
    .replace(/\u2029/g,"\\u2029");
}

function escapeAttr(v=""){
  return String(v).replace(/[&"'<>]/g,c=>({"&":"&amp;","\"":"&quot;","'":"&#39;","<":"&lt;",">":"&gt;"}[c]));
}
