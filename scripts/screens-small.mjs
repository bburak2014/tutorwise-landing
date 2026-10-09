// Telefon için küçük ekran görüntüleri: public/screens/<dil>/<ekran>.webp'den
// %45 genişlikte <ekran>.sm.webp. Dar ekranda 3D'deki cihazlar küçük olduğu
// için tam boy görüntüye gerek yok (Device.tsx). capture-screens.mjs her
// çekimden sonra çağırır; elle: node scripts/screens-small.mjs
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export const SMALL = 0.45;

export async function writeSmallScreen(file) {
  const { width } = await sharp(file).metadata();
  const out = file.replace(/\.webp$/, ".sm.webp");
  await sharp(file)
    .resize({ width: Math.round(width * SMALL) })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = path.resolve("public/screens");
  for (const locale of readdirSync(root)) {
    for (const name of readdirSync(path.join(root, locale))) {
      if (!name.endsWith(".webp") || name.endsWith(".sm.webp")) continue;
      await writeSmallScreen(path.join(root, locale, name));
    }
    console.log(`${locale} ✓`);
  }
}
