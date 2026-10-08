// İndirilmiş CC0 varlıkları siteye hazırlar: dokuları WebP'ye çevirip
// küçültür, HDRI'yi kopyalar. Kaynaklar ve lisanslar: public/3d/LICENSES.md.
// Kullanım: node scripts/optimize-3d.mjs <indirme-klasörü>
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const source = path.resolve(process.argv[2] ?? "");
const out = path.resolve("public/3d");
mkdirSync(path.join(out, "textures"), { recursive: true });
mkdirSync(path.join(out, "hdri"), { recursive: true });

const textures = [
  // [kaynak, hedef, boyut, kalite]
  ["book_pattern_nor_gl_1k.jpg", "cover-normal.webp", 1024, 90],
  ["book_pattern_rough_1k.jpg", "cover-rough.webp", 512, 85],
  ["paper/Paper003_1K-JPG_NormalGL.jpg", "paper-normal.webp", 1024, 88],
  ["paper/Paper003_1K-JPG_Roughness.jpg", "paper-rough.webp", 512, 85],
];

for (const [from, to, size, quality] of textures) {
  const target = path.join(out, "textures", to);
  await sharp(path.join(source, from)).resize(size, size).webp({ quality, effort: 6 }).toFile(target);
  console.log(`${to}: ${Math.round(statSync(target).size / 1024)} KB`);
}

const hdri = path.join(out, "hdri", "studio_small_09_1k.hdr");
copyFileSync(path.join(source, "studio_small_09_1k.hdr"), hdri);
console.log(`studio_small_09_1k.hdr: ${Math.round(statSync(hdri).size / 1024)} KB`);
