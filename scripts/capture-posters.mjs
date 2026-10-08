// WebGL'siz tarayıcılar için 3D sahnenin sabit görüntülerini çeker:
// public/poster/<wide|narrow>-<sahne>.webp. Kitapta yazı olmadığından
// görüntüler bütün dillerde ortaktır; cihazlar (dile göre ekranlı) gizlenir.
// Önce: pnpm build && pnpm serve. Kullanım: node scripts/capture-posters.mjs [adres]
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { launchChrome, wait } from "./lib/cdp.mjs";
import { scenes } from "../three/choreography.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:4321";
const out = path.resolve("public/poster");
mkdirSync(out, { recursive: true });

const layouts = [
  { name: "wide", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "narrow", width: 390, height: 844, dpr: 2, mobile: true },
];

const chrome = await launchChrome({ port: 9336 });
try {
  for (const layout of layouts) {
    const page = await chrome.newPage();
    await page.viewport(layout.width, layout.height, { dpr: layout.dpr, mobile: layout.mobile });
    await page.goto(`${origin}/tr/?poster=0.5`, { settle: 7000 });
    for (const [i, scene] of scenes.entries()) {
      await page.eval(`window.setPosterBeat(${i + 0.5})`);
      await wait(1500);
      const { data } = await page.send("Page.captureScreenshot", { format: "png" });
      const file = path.join(out, `${layout.name}-${scene}.webp`);
      await sharp(Buffer.from(data, "base64")).webp({ quality: 78, effort: 6 }).toFile(file);
      console.log(`${layout.name}-${scene} ✓`);
    }
    if (page.consoleErrors.length) console.warn(page.consoleErrors.slice(0, 3));
    page.close();
  }
} finally {
  await chrome.close();
}
