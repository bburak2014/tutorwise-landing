import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/** Klasörlerdeki dosyaların (ad ve içerik) kısa özeti. Ekran görüntüleri ve
 *  posterlerin adreslerine ?v= olarak eklenir (lib/assets.ts): dosyalar
 *  değişince adres de değişir, bu yüzden uzun önbellek güvenlidir. Yalnız
 *  derleme sırasında çalışır (next.config.ts). */
export function assetVersion(dirs: readonly string[]): string {
  const hash = createHash("sha256");
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else hash.update(path.relative(dir, file)).update(readFileSync(file));
    }
  };
  for (const dir of dirs) walk(dir);
  return hash.digest("hex").slice(0, 10);
}
