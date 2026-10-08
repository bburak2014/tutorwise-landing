// Derlenmiş siteyi (out/, sıradan statik sunucu) gerçek tarayıcıda denetler:
//  1. "/" dil yönlendirmesi: çerez > tarayıcı dili > İngilizce
//  2. 7 dil × masaüstü ve telefon: lang, 3D tuval, yatay taşma, konsol
//     hatası, 4xx/5xx istek (bütün sahneler kaydırılarak)
//  3. Kaydırma sırasında kare hızı (headless; gerçek cihazı temsil etmez)
//  4. Hareket azaltma: metin animasyonsuz ve hemen görünür
//  5. WebGL kapalı: tuval yok, sahnenin poster görüntüsü yüklü
//  6. Konsolda uyarı yok; CSP Cloudflare analitiğine izin veriyor; aria-label
//     yalnız izin verilen öğelerde; LCP öğesi açılış başlığı
// Önce: pnpm build && pnpm serve. Kullanım: node scripts/verify.mjs [adres]
import { writeFileSync, mkdirSync } from "node:fs";
import { launchChrome, wait } from "./lib/cdp.mjs";
import { locales } from "../i18n/locales.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:4321";
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  const suffix = detail ? " — " + JSON.stringify(detail) : "";
  console.log(`${ok ? "✓" : "✗"} ${name}${suffix}`);
};

async function withPage(chrome, fn) {
  const page = await chrome.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

const chrome = await launchChrome({ port: 9341 });
try {
  // 1. Yönlendirme
  const { userAgent } = await withPage(chrome, (page) => page.send("Browser.getVersion"));
  const cases = [
    { acceptLanguage: "de-DE,de;q=0.9,en;q=0.8", cookie: "", expect: "/de/" },
    { acceptLanguage: "pt-BR,pt;q=0.9", cookie: "", expect: "/en/" },
    { acceptLanguage: "zh-CN,zh;q=0.9", cookie: "", expect: "/zh/" },
    { acceptLanguage: "de-DE", cookie: "ja", expect: "/ja/" },
  ];
  for (const c of cases) {
    const path = await withPage(chrome, async (page) => {
      await page.send("Network.clearBrowserCookies");
      await page.send("Network.setUserAgentOverride", { userAgent, acceptLanguage: c.acceptLanguage });
      if (c.cookie) await page.send("Network.setCookie", { name: "derslik-locale", value: c.cookie, url: origin });
      await page.goto(`${origin}/`, { settle: 1500 });
      return page.eval("location.pathname");
    });
    const cookie = c.cookie ? "cookie=" + c.cookie + " " : "";
    check(`redirect ${cookie}lang=${c.acceptLanguage.split(",")[0]}`, path === c.expect, { path });
  }

  // 2. Diller × düzenler
  const layouts = [
    { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
    { name: "phone", width: 390, height: 844, dpr: 2, mobile: true },
  ];
  for (const locale of locales)
    for (const layout of layouts) {
      const r = await withPage(chrome, async (page) => {
        await page.viewport(layout.width, layout.height, { dpr: layout.dpr, mobile: layout.mobile });
        await page.goto(`${origin}/${locale}/`, { settle: 6000 });
        const tops = await page.eval(`[...document.querySelectorAll("[data-scene]")].map((el) => el.getBoundingClientRect().top + scrollY)`);
        for (const top of tops) {
          await page.eval(`scrollTo(0, ${top})`);
          await wait(500);
        }
        await page.eval(`scrollTo(0, document.body.scrollHeight)`);
        await wait(800);
        const state = await page.eval(`({
          // aria-label'ın yasak olduğu örtük roller (generic, paragraph, blockquote…)
          badAria: [...document.querySelectorAll("[aria-label]")]
            .filter((el) => !el.hasAttribute("role") && ["BLOCKQUOTE", "P", "SPAN", "DIV", "EM", "STRONG", "CODE"].includes(el.tagName))
            .map((el) => el.tagName.toLowerCase() + ": " + el.getAttribute("aria-label").slice(0, 40)),
          lang: document.documentElement.lang,
          canvas: Boolean(document.querySelector(".stage canvas")),
          canvasOpacity: document.querySelector(".stage canvas")?.parentElement?.parentElement?.style.opacity ?? null,
          overflow: document.documentElement.scrollWidth - innerWidth,
          scenes: document.querySelectorAll("[data-scene]").length,
        })`);
        return { ...state, errors: page.consoleErrors, warnings: page.consoleWarnings, failed: page.failedRequests };
      });
      const ok =
        r.lang === locale &&
        r.canvas &&
        r.overflow <= 0 &&
        r.scenes === 10 &&
        r.errors.length === 0 &&
        r.warnings.length === 0 &&
        r.badAria.length === 0 &&
        r.failed.length === 0;
      check(`${locale} ${layout.name}`, ok, ok ? undefined : r);
    }

  // LCP: ilk yüklemede en büyük boyanan öğe açılış başlığı olmalı (logo değil).
  for (const layout of layouts) {
    const lcp = await withPage(chrome, async (page) => {
      await page.viewport(layout.width, layout.height, { dpr: layout.dpr, mobile: layout.mobile });
      await page.goto(`${origin}/tr/`, { settle: 3000 });
      return page.eval(`new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const last = list.getEntries().at(-1);
          resolve({ tag: last?.element?.tagName ?? null, inHeroTitle: Boolean(last?.element?.closest("#top h1")), text: (last?.element?.textContent ?? "").trim().slice(0, 30) });
        }).observe({ type: "largest-contentful-paint", buffered: true });
      })`);
    });
    check(`LCP is the hero title (${layout.name})`, lcp.inHeroTitle, lcp);
  }

  // CSP, Cloudflare'in sayfaya eklediği analitik betiğine izin vermeli.
  const analytics = await withPage(chrome, async (page) => {
    await page.goto(`${origin}/tr/`, { settle: 1500 });
    const before = page.consoleErrors.length;
    await page.eval(`(() => { const s = document.createElement("script"); s.defer = true; s.src = "https://static.cloudflareinsights.com/beacon.min.js"; document.head.append(s); })()`);
    await wait(1500);
    return { violations: page.consoleErrors.slice(before).filter((e) => e.includes("Content Security Policy")) };
  });
  check("CSP allows Cloudflare Web Analytics", analytics.violations.length === 0, analytics);

  // 3. Kare hızı (masaüstü, sayfa boyunca 14 sn kaydırma)
  const fps = await withPage(chrome, async (page) => {
    await page.viewport(1440, 900, { dpr: 1, mobile: false });
    await page.goto(`${origin}/tr/`, { settle: 7000 });
    return page.eval(`new Promise((resolve) => {
      const frames = [];
      const max = document.body.scrollHeight - innerHeight;
      const start = performance.now();
      let last = start;
      const step = (now) => {
        frames.push(now - last);
        last = now;
        const t = (now - start) / 14000;
        scrollTo(0, max * Math.min(1, t));
        if (t < 1) requestAnimationFrame(step);
        else {
          const sorted = frames.slice(5).sort((a, b) => a - b);
          const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
          resolve({ fps: Math.round(1000 / avg), p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]), frames: sorted.length });
        }
      };
      requestAnimationFrame(step);
    })`);
  });
  check("scroll fps (headless, desktop)", fps.fps >= 30, fps);

  // 4. Hareket azaltma
  const reduced = await withPage(chrome, async (page) => {
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await page.viewport(1440, 900, { dpr: 1, mobile: false });
    await page.goto(`${origin}/tr/`, { settle: 300 });
    return page.eval(`({
      heroOpacity: [...document.querySelectorAll("#top [data-reveal]")].map((el) => getComputedStyle(el).opacity),
      motionDone: document.documentElement.classList.contains("motion-done"),
    })`);
  });
  check("reduced motion: hero visible at once", reduced.heroOpacity.every((o) => o === "1") && reduced.motionDone, reduced);
} finally {
  await chrome.close();
}

// 5. WebGL kapalı (ayrı Chrome)
const plain = await launchChrome({ port: 9342, args: ["--disable-webgl", "--disable-3d-apis"] });
try {
  const r = await withPage(plain, async (page) => {
    await page.viewport(1440, 900, { dpr: 1, mobile: false });
    await page.goto(`${origin}/tr/`, { settle: 3000 });
    const top = await page.eval(`document.querySelector('[data-scene="chapter-live"]').getBoundingClientRect().top + scrollY`);
    await page.eval(`scrollTo(0, ${top})`);
    await wait(1500);
    return page.eval(`({
      canvas: Boolean(document.querySelector(".stage canvas")),
      poster: document.querySelector(".stage img")?.getAttribute("src") ?? null,
      loaded: (document.querySelector(".stage img")?.naturalWidth ?? 0) > 0,
    })`);
  });
  check("no WebGL: poster instead of canvas", !r.canvas && r.loaded && r.poster === "/poster/wide-chapter-live.webp", r);
} finally {
  await plain.close();
}

mkdirSync("reports", { recursive: true });
writeFileSync("reports/verify.json", JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
