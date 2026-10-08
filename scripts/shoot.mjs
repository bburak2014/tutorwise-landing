// Doğrulama için ekran görüntüsü: bir sayfayı verilen boyutta açar, her
// bölümün başına kaydırıp görüntü alır; konsol hatalarını ve 4xx/5xx
// istekleri yazar. Kullanım:
//   node scripts/shoot.mjs <url> <ad> [genişlik] [yükseklik] [mobile]
import { mkdirSync } from "node:fs";
import { launchChrome, wait } from "./lib/cdp.mjs";

const [url, name, width = "1440", height = "900", mobile] = process.argv.slice(2);
const dir = "reports/shots";
// 3D tuvalin belirmesi ve kaydırma yumuşatmasının oturması için beklemeler.
const settle = Number(process.env.SETTLE ?? 1200);
const pause = Number(process.env.PAUSE ?? 700);
mkdirSync(dir, { recursive: true });

const chrome = await launchChrome();
try {
  const page = await chrome.newPage();
  const isMobile = mobile === "mobile";
  await page.viewport(Number(width), Number(height), { dpr: isMobile ? 2 : 1, mobile: isMobile });
  await page.goto(url, { settle });
  const scenes = await page.eval(
    `[...document.querySelectorAll("[data-scene]")].filter((el) => el.getClientRects().length > 0).map((el) => [el.dataset.scene, Math.round(el.getBoundingClientRect().top + scrollY)])`,
  );
  const shots = [["top", 0], ...scenes.filter(([scene]) => scene !== "hero")];
  for (const [scene, top] of shots) {
    await page.eval(`window.scrollTo(0, ${top})`);
    await wait(pause);
    await page.screenshot(`${dir}/${name}-${scene}.png`);
  }
  await page.eval(`window.scrollTo(0, document.body.scrollHeight)`);
  await wait(pause);
  await page.screenshot(`${dir}/${name}-bottom.png`);
  console.log(JSON.stringify({ shots: shots.length + 1, consoleErrors: page.consoleErrors, failedRequests: page.failedRequests }, null, 2));
  page.close();
} finally {
  await chrome.close();
}
