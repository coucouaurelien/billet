export default async (req) => {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  const endpoint = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.BILLET_API_SECRET;
  let signature = "";

  if (slug && endpoint && secret) {
    try {
      const target = `${endpoint}?action=get&slug=${encodeURIComponent(slug)}&secret=${encodeURIComponent(secret)}`;
      const r = await fetch(target, { redirect:"follow" });
      const data = await r.json();
      if (data?.ok) signature = String(data.signature || "");
    } catch (_) {}
  }

  const letter = initialKey(signature || slug);
  const origin = url.origin;
  const canonical = `${origin}/${encodeURIComponent(slug)}`;
  const image = `${origin}/assets/og/initial-${letter}.jpg?v=18-${encodeURIComponent(slug)}`;
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#050505">
  <title>Billet Doux</title>
  <meta name="description" content="Billet Doux">
  <meta property="og:title" content="Billet Doux">
  <meta property="og:description" content="Billet Doux">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:image" content="${escapeAttr(image)}">
  <meta property="og:image:secure_url" content="${escapeAttr(image)}">
  <meta property="og:image:url" content="${escapeAttr(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="Billet Doux">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Billet Doux">
  <meta name="twitter:description" content="Billet Doux">
  <meta name="twitter:image" content="${escapeAttr(image)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="preload" href="/assets/fonts/Coucouaurelien-V2-Regular.otf" as="font" type="font/otf" crossorigin>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main id="app" class="app" aria-live="polite"></main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script src="/cards.generated.js"></script>
  <script src="/config.js"></script>
  <script src="/app.js" defer></script>
</body>
</html>`;
  return new Response(html,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
};

function initialKey(value=""){
  const normalized = String(value).trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const match = normalized.match(/[A-Z]/);
  return match ? match[0] : "OTHER";
}
function escapeAttr(v=""){
  return String(v).replace(/[&"'<>]/g,c=>({"&":"&amp;","\"":"&quot;","'":"&#39;","<":"&lt;",">":"&gt;"}[c]));
}
