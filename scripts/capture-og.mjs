// Paylaşım görselleri (Open Graph): her dil sayfasının açılış görünümü,
// 1200×630, public/og/<dil>.jpg. Önce: pnpm build && pnpm serve.
// Kullanım: node scripts/capture-og.mjs [adres]
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { launchChrome } from "./lib/cdp.mjs";
import { locales } from "../i18n/locales.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:4321";
const out = path.resolve("public/og");
mkdirSync(out, { recursive: true });

const chrome = await launchChrome({ port: 9337 });
try {
  for (const locale of locales) {
    const page = await chrome.newPage();
    try {
      await page.viewport(1200, 630, { dpr: 1, mobile: false });
      await page.goto(`${origin}/${locale}/`, { settle: 7000 });
      const { data } = await page.send("Page.captureScreenshot", { format: "png" });
      await sharp(Buffer.from(data, "base64"))
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(path.join(out, `${locale}.jpg`));
      console.log(`${locale} ✓`, page.consoleErrors.length ? page.consoleErrors.slice(0, 2) : "");
    } finally {
      await page.close();
    }
  }
} finally {
  await chrome.close();
}
