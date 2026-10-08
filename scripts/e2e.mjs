// Uçtan uca kullanıcı testleri: bir ziyaretçinin yaptığını gerçek tarayıcıda
// (gerçek fare olayları) yapar ve sonucu ölçer. verify.mjs sayfanın
// kendisini, bu betik etkileşimleri denetler:
//  1. Adresi henüz olmayan bağlantılar (#) sayfayı kımıldatmaz
//  2. Menü bağlantıları ve bölüm çizgisi doğru yere götürür; 3D aradaki
//     sahneleri hızla oynatmadan yeni sahneye geçer
//  3. Düğmeler ve kartlar imleç üstüne gelince yerinden oynamaz
//  4. Fare tekerleği sayfayı hemen kaydırır (ataletli gecikme yok)
//  5. Açılış oturumda bir kez oynar (dil değişince ya da logoya basınca değil)
//  6. 3D'nin ilk kez görünen parçaları kareyi dondurmaz; boşta tuval tam
//     hızda çizilmez; tuval çözünürlüğü bütçede
//  7. Alt bilgide dev süs yazısı yok
//  8. Telefonda menü açılır, bağlantı doğru bölüme götürür, menü kapanır
//  9. Dil seçici seçilen dile götürür
// 3D'nin durumu ?e2e ile açılan window.__story'den okunur.
// Önce: pnpm build && pnpm serve. Kullanım: node scripts/e2e.mjs [adres]
import { launchChrome, wait } from "./lib/cdp.mjs";

const origin = process.argv[2] ?? "http://127.0.0.1:4321";
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  const suffix = detail === undefined ? "" : " — " + JSON.stringify(detail);
  console.log(`${ok ? "✓" : "✗"} ${name}${suffix}`);
};

// Sayfa betiklerinden önce çalışır: tuvalin kaç karede çizdiğini ve uzun
// kareleri (Long Animation Frames) sayar.
const PROBE = `(() => {
  let tick = 0, last = -1;
  window.__drawFrames = 0;
  window.__ticks = 0;
  const loop = () => { tick++; window.__ticks++; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const proto = WebGL2RenderingContext.prototype;
  for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "drawRangeElements"]) {
    const original = proto[name];
    if (!original) continue;
    proto[name] = function (...args) {
      if (last !== tick) { last = tick; window.__drawFrames++; }
      return original.apply(this, args);
    };
  }
  // Kaydırırken derlenen gölgelendirici ve yüklenen doku: ilk görünüşte
  // kareyi donduran işler. Sahne hazır olmadan önce yapılmış olmalı.
  window.__programs = 0;
  window.__uploads = 0;
  const count = (name, key) => {
    const original = proto[name];
    if (!original) return;
    proto[name] = function (...args) { window[key]++; return original.apply(this, args); };
  };
  count("linkProgram", "__programs");
  // Yalnız gerçek görseller (resim, tuval) ve 64 KB'tan büyük veri sayılır;
  // kemikli sayfaların her karede güncellenen küçük kemik dokusu sayılmaz.
  for (const name of ["texImage2D", "texSubImage2D", "texImage3D"]) {
    const original = proto[name];
    proto[name] = function (...args) {
      const big = args.some((a) => a && typeof a === "object" && ("width" in a || (a.byteLength ?? 0) > 65536));
      if (big) window.__uploads++;
      return original.apply(this, args);
    };
  }
  window.__loaf = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__loaf.push(Math.round(entry.duration));
  }).observe({ type: "long-animation-frame", buffered: true });
})();`;

async function open(chrome, { width, height, dpr, mobile }) {
  const page = await chrome.newPage();
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });
  await page.viewport(width, height, { dpr, mobile });
  if (mobile) await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  return page;
}

/** 3D göründü ve açılış bitti mi (en fazla 30 sn). */
async function sceneReady(page) {
  for (let i = 0; i < 150; i++) {
    const ok = await page.eval(`(() => {
      const wrap = document.querySelector(".stage > div[style*='opacity']");
      return Boolean(window.__story && document.querySelector(".stage canvas") && wrap?.style.opacity === "1" && window.__story.intro === 1);
    })()`);
    if (ok) return true;
    await wait(200);
  }
  return false;
}

const mouse = (page, type, x, y, extra = {}) =>
  page.send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", clickCount: 1, ...extra });

/** Öğenin ortasına gerçek fareyle tıklar. `el` sayfada bir öğe döndüren ifade. */
async function click(page, el) {
  const point = await page.eval(`(() => { const b = (${el}).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  await mouse(page, "mouseMoved", point.x, point.y);
  await mouse(page, "mousePressed", point.x, point.y);
  await mouse(page, "mouseReleased", point.x, point.y);
}

/** Bir eylem boyunca her karede 3D'nin beat'ini kaydeder. */
async function recordBeats(page, action, ms = 1600) {
  const before = await page.eval(`window.__story.beat`);
  await page.eval(`window.__rec = true; window.__beats = []; (function rec() { window.__beats.push(window.__story.beat); if (window.__rec) requestAnimationFrame(rec); })(); 0`);
  await action();
  await wait(ms);
  const { beats, after } = await page.eval(`window.__rec = false; ({ beats: window.__beats, after: window.__story.target })`);
  // Baştaki ve sondaki sahnenin dışında, aradaki sahnelerden geçen kareler.
  const lo = Math.min(before, after) + 1;
  const hi = Math.max(before, after) - 1;
  const between = beats.filter((b) => b > lo && b < hi).length;
  return { before: +before.toFixed(2), after: +after.toFixed(2), frames: beats.length, between };
}

const settle = () => wait(1400);
const scrollTo = (page, y) => page.eval(`scrollTo({ top: ${y}, behavior: "instant" }); 0`);

const chrome = await launchChrome({ port: 9351 });
try {
  // ── Masaüstü ────────────────────────────────────────────────────────────
  const desk = await open(chrome, { width: 1440, height: 900, dpr: 2, mobile: false });
  await desk.goto(`${origin}/tr/?e2e`, { settle: 500 });
  const ready = await sceneReady(desk);
  check("desktop: 3D appears and the intro finishes", ready);
  await wait(800);

  // 6a. Tuval çözünürlüğü: ekranın en fazla 1,5 katı (Retina'da 4 kat piksel değil).
  const canvas = await desk.eval(`({ ratio: +(document.querySelector(".stage canvas").width / innerWidth).toFixed(2) })`);
  check("canvas resolution within budget (≤ 1.5× CSS pixels)", canvas.ratio <= 1.51, canvas);

  // 6b. Boşta: kimse kaydırmıyorken tuval her karede çizilmez.
  await wait(1500);
  const idle = await desk.eval(`(async () => {
    const d0 = window.__drawFrames, t0 = window.__ticks;
    await new Promise((r) => setTimeout(r, 2000));
    return { drawn: window.__drawFrames - d0, frames: window.__ticks - t0 };
  })()`);
  idle.share = +(idle.drawn / idle.frames).toFixed(2);
  check("idle: canvas is not redrawn every frame", idle.share <= 0.85, idle);

  // 4. Fare tekerleği: sayfa hemen kayar.
  const wheel = await desk.eval(`(async () => {
    const y0 = scrollY;
    return { y0 };
  })()`);
  await mouse(desk, "mouseMoved", 720, 450);
  await desk.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 720, y: 450, deltaX: 0, deltaY: 400 });
  await wait(250);
  wheel.after250ms = await desk.eval(`Math.round(scrollY)`);
  check("wheel scrolls immediately (≥ 95% of 400px within 250ms)", wheel.after250ms - wheel.y0 >= 380, wheel);
  await scrollTo(desk, 0);
  await settle();

  // 6c. İlk kez görünen parçalar (cihazlar, ekranlar) kareyi dondurmaz.
  await desk.eval(`window.__loaf.length = 0; window.__programs = 0; window.__uploads = 0; 0`);
  const tops = await desk.eval(`[...document.querySelectorAll("[data-scene]")].filter((el) => el.getClientRects().length > 0).map((el) => Math.round(el.getBoundingClientRect().top + scrollY))`);
  for (const top of tops) {
    await scrollTo(desk, top + 40);
    await wait(700);
  }
  const firstUse = await desk.eval(`({ programs: window.__programs, uploads: window.__uploads, longestFrames: [...window.__loaf].sort((a, b) => b - a).slice(0, 3) })`);
  check(
    "scenes appearing for the first time compile no shaders and upload no textures (no first-use freeze)",
    firstUse.programs === 0 && firstUse.uploads === 0,
    firstUse,
  );

  // 2. Menü bağlantıları: doğru bölüm, 3D aradaki sahneleri oynatmaz.
  await scrollTo(desk, 0);
  await settle();
  for (const href of ["#audiences", "#features", "#download", "#about"]) {
    const r = await recordBeats(desk, () => click(desk, `document.querySelector('header nav a[href="${href}"]')`));
    const landed = await desk.eval(`Math.round(document.querySelector("${href}").getBoundingClientRect().top)`);
    const header = await desk.eval(`Math.round(document.querySelector("header").getBoundingClientRect().height)`);
    const ok = r.between === 0 && Math.abs(landed - header) <= 4;
    check(`nav ${href}: lands on the section, 3D cuts without replaying scenes in between`, ok, { ...r, landed, header });
    await settle();
  }

  // 2b. Bölüm çizgisi: 01'den 05'e atlarken aradaki sayfalar çevrilmez.
  const plan = await desk.eval(`Math.round(document.querySelector('[data-marker][data-scene="chapter-plan"]').getBoundingClientRect().top + scrollY)`);
  await scrollTo(desk, plan + 40);
  await settle();
  const rail = await recordBeats(desk, () => click(desk, `document.querySelectorAll("#features nav button")[4]`));
  const current = await desk.eval(`document.querySelector('#features nav button[aria-current="step"]')?.textContent`);
  check("chapter rail 01 → 05: lands on 05, no page riffle in between", rail.between === 0 && current === "05", { ...rail, current });
  await settle();

  // 2c. Hızlı fırlatma (sayfanın dibinden başa 0,6 sn'de): 3D sayfayı
  // zarifçe izleyemeyecek kadar hızlı kayarken görünür biçimde yarışmaz;
  // kararır, kaydırma durunca yeni yerinde belirir.
  await scrollTo(desk, 100000);
  await settle();
  const fling = await desk.eval(`(async () => {
    const stage = document.querySelector(".stage");
    const from = scrollY, ms = 600, frames = [];
    let last = window.__story.beat, lastT = performance.now();
    await new Promise((done) => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / ms);
        scrollTo(0, from * (1 - t));
        const beat = window.__story.beat;
        const dt = (now - lastT) / 1000;
        if (dt > 0) frames.push({ speed: Math.abs(beat - last) / dt, opacity: +getComputedStyle(stage).opacity });
        last = beat;
        lastT = now;
        if (now - start < ms + 1200) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    return {
      frames: frames.length,
      visibleRacing: frames.filter((f) => f.speed > 3 && f.opacity > 0.5).length,
      maxSpeed: Math.round(Math.max(...frames.map((f) => f.speed))),
      endOpacity: +getComputedStyle(stage).opacity,
    };
  })()`);
  check(
    "fast fling to the top: the 3D never races visibly and is fully back afterwards",
    fling.visibleRacing === 0 && fling.endOpacity > 0.99,
    fling,
  );
  await settle();

  // 2d. Sakin kaydırma (3 sahne, 3 sn'de): 3D kararmaz, sahneleri izler.
  await scrollTo(desk, 0);
  await settle();
  const calm = await desk.eval(`(async () => {
    const stage = document.querySelector(".stage");
    const to = [...document.querySelectorAll('[data-scene="chapter-live"]')].find((e) => e.getClientRects().length).getBoundingClientRect().top + scrollY;
    let lowest = 1;
    await new Promise((done) => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 3000);
        scrollTo(0, to * t);
        lowest = Math.min(lowest, +getComputedStyle(stage).opacity);
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    return { lowestOpacity: lowest, beat: +window.__story.beat.toFixed(2) };
  })()`);
  check("calm scrolling keeps the 3D visible the whole way", calm.lowestOpacity > 0.99 && calm.beat > 2.5, calm);
  await settle();

  // 3. İmleç üstüne gelince düğmeler ve kartlar yerinden oynamaz.
  const targets = [
    `document.querySelector("#top .btn-primary")`,
    `document.querySelector('[aria-labelledby="final-title"] .btn-primary')`,
    `document.querySelector("#audiences a")`,
  ];
  for (const el of targets) {
    await desk.eval(`(${el}).scrollIntoView({ block: "center", behavior: "instant" }); 0`);
    await wait(500);
    const box = `(() => { const b = (${el}).getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => +v.toFixed(1)); })()`;
    const before = await desk.eval(box);
    const [x, y, w, h] = before;
    // Yaklaş, üstüne gel, içinde gezin.
    for (const [px, py] of [[x - 40, y + h / 2], [x + w * 0.2, y + h * 0.3], [x + w * 0.8, y + h * 0.7]]) {
      await mouse(desk, "mouseMoved", px, py);
      await wait(350);
    }
    const during = await desk.eval(box);
    const transform = await desk.eval(`(() => { let n = ${el}; const out = []; while (n && n !== document.body) { const t = getComputedStyle(n).transform; if (t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)") out.push(n.tagName + ":" + t); n = n.parentElement; } return out; })()`);
    const moved = before.some((v, i) => Math.abs(v - during[i]) > 0.5) || transform.length > 0;
    check(`hover keeps ${el.match(/\(["'](.+)["']\)/)[1]} in place`, !moved, { before, during, transform });
    await mouse(desk, "mouseMoved", 5, 5);
  }

  // 1. Adresi olmayan bağlantılar (#) sayfayı kımıldatmaz.
  const placeholders = await desk.eval(`[...document.querySelectorAll('a[href="#"]')].filter((a) => a.getClientRects().length > 0 && a.offsetWidth > 0).length`);
  const moves = [];
  for (let i = 0; i < placeholders; i++) {
    const el = `[...document.querySelectorAll('a[href="#"]')].filter((a) => a.getClientRects().length > 0 && a.offsetWidth > 0)[${i}]`;
    await desk.eval(`(${el}).scrollIntoView({ block: "center", behavior: "instant" }); 0`);
    await wait(900);
    const before = await desk.eval(`({ y: Math.round(scrollY), hash: location.hash })`);
    await click(desk, el);
    await wait(500);
    const after = await desk.eval(`({ y: Math.round(scrollY), hash: location.hash, label: (${el}).textContent.trim().slice(0, 24) })`);
    if (Math.abs(after.y - before.y) > 1 || after.hash !== before.hash) moves.push({ ...after, from: before });
  }
  check(`placeholder links (#) do not move the page (${placeholders} links)`, placeholders > 0 && moves.length === 0, { moves: moves.slice(0, 4) });

  // 7. Alt bilgide dev süs yazısı yok.
  const footer = await desk.eval(`Math.max(...[...document.querySelectorAll("footer *")].map((el) => parseFloat(getComputedStyle(el).fontSize)))`);
  check("footer has no giant decorative text (font-size ≤ 64px)", footer <= 64, { largest: footer });

  check("desktop: no console errors", desk.consoleErrors.length === 0, desk.consoleErrors.slice(0, 3));

  // 5. Açılış oturumda bir kez: aynı sekmede başka dile/sayfaya geçince tekrar oynamaz.
  await desk.goto(`${origin}/en/?e2e`, { settle: 0 });
  let lowest = 1;
  for (let i = 0; i < 40; i++) {
    const intro = await desk.eval(`window.__story ? window.__story.intro : 1`);
    lowest = Math.min(lowest, intro);
    await wait(150);
  }
  check("intro plays once per session (not again after switching language)", lowest === 1, { lowestIntro: lowest });
  await desk.close();

  // 9. Dil seçici.
  const lang = await open(chrome, { width: 1440, height: 900, dpr: 1, mobile: false });
  await lang.goto(`${origin}/tr/`, { settle: 1500 });
  await click(lang, `document.querySelector("header [aria-haspopup], header button[aria-expanded]")`);
  await wait(300);
  await click(lang, `document.querySelector('header a[hreflang="de"]')`);
  await wait(2500);
  const switched = await lang.eval(`({ path: location.pathname, lang: document.documentElement.lang })`);
  check("language switcher goes to the chosen language", switched.path === "/de/" && switched.lang === "de", switched);
  await lang.close();

  // ── Telefon ─────────────────────────────────────────────────────────────
  const phone = await open(chrome, { width: 390, height: 844, dpr: 2, mobile: true });
  const menuButton = `[...document.querySelectorAll("header button[aria-controls]")].find((b) => document.getElementById(b.getAttribute("aria-controls"))?.querySelector('a[href="#audiences"]'))`;
  const menuPanel = `document.getElementById((${menuButton}).getAttribute("aria-controls"))`;
  await phone.goto(`${origin}/tr/?e2e`, { settle: 2500 });
  await click(phone, menuButton);
  await wait(300);
  const menuOpen = await phone.eval(`!(${menuPanel}).hidden`);
  const phoneJump = await recordBeats(phone, () => click(phone, `[...document.querySelectorAll('header a[href="#audiences"]')].find((a) => a.offsetWidth > 0)`));
  const phoneState = await phone.eval(`({
    menuClosed: (${menuPanel}).hidden,
    landed: Math.round(document.querySelector("#audiences").getBoundingClientRect().top),
    header: Math.round(document.querySelector("header").getBoundingClientRect().height),
  })`);
  check(
    "phone menu: opens, link lands on the section, menu closes, 3D does not replay",
    menuOpen && phoneState.menuClosed && Math.abs(phoneState.landed - phoneState.header) <= 4 && phoneJump.between === 0,
    { menuOpen, ...phoneState, ...phoneJump },
  );
  check("phone: no console errors", phone.consoleErrors.length === 0, phone.consoleErrors.slice(0, 3));
  await phone.close();
} finally {
  await chrome.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
