import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const cardsDir = path.join(root, "site", "assets", "cards");
const output = path.join(root, "site", "cards.generated.js");
const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

const slugify = (value) => value
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  .slice(0, 48) || "carte";

const labelize = (name) => name
  .replace(/\.[^.]+$/, "")
  .replace(/^RISO[_ -]*OR[_ -]*/i, "")
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/\b\w/g, c => c.toUpperCase());

const files = (await readdir(cardsDir))
  .filter(file => allowed.has(path.extname(file).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" }));

if (!files.length) throw new Error("Aucune image trouvée dans site/assets/cards/");

const cards = files.map((file) => {
  const label = labelize(file);
  return {
    id: slugify(label),
    label,
    src: `/assets/cards/${encodeURIComponent(file).replace(/%2F/g, "/")}`
  };
});

const source = `// Généré automatiquement à chaque build Netlify.\nwindow.SV_CARDS = ${JSON.stringify(cards, null, 2)};\n`;
await writeFile(output, source, "utf8");
console.log(`✓ ${cards.length} carte(s) détectée(s) dans site/assets/cards/`);
