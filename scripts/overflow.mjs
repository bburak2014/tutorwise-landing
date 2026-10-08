// Yatay taşmayı bulur: sayfayı verilen genişlikte açar, görünür alanın
// sağından taşan en dıştaki öğeleri yazar. Kullanım:
//   node scripts/overflow.mjs <url> [genişlik] [yükseklik]
import { launchChrome } from "./lib/cdp.mjs";

const [url, width = "390", height = "844"] = process.argv.slice(2);
const chrome = await launchChrome({ port: 9334 });
try {
  const page = await chrome.newPage();
  await page.viewport(Number(width), Number(height), { dpr: 2, mobile: true });
  await page.goto(url, { settle: 800 });
  const result = await page.eval(`(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > vw + 0.5)
      .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= vw + 0.5)
      .slice(0, 10)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 80),
        text: (el.textContent || "").trim().slice(0, 60),
        right: Math.round(el.getBoundingClientRect().right),
      }));
    return { vw, scrollWidth: document.documentElement.scrollWidth, offenders };
  })()`);
  console.log(JSON.stringify(result, null, 2));
  page.close();
} finally {
  await chrome.close();
}
