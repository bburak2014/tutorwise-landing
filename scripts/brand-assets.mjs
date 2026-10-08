// Logodan üretilen dosyalar: public/favicon.svg (64) ve public/icon.svg
// (1024, uygulama simgesi). Kaynak lib/brand.ts; logo değişince çalıştırın.
// Kullanım: node scripts/brand-assets.mjs
import { writeFileSync } from "node:fs";
import { iconSvg } from "../lib/brand.ts";

writeFileSync("public/favicon.svg", iconSvg(64));
writeFileSync("public/icon.svg", iconSvg(1024));
console.log("public/favicon.svg, public/icon.svg ✓");
