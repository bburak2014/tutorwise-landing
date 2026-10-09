"use client";
import { useEffect } from "react";
import { beatFromScroll, isCut, restingBeat } from "@/three/choreography.ts";
import { layoutFor, prefersReducedMotion } from "@/three/quality.ts";
import { story } from "@/three/story.ts";
import { motionReady } from "./motion.ts";

/** 3D'nin zarifçe izleyebileceği en yüksek kaydırma hızı (sahne/sn). */
const RACE_SPEED = 3;
/** Hızlı kaydırma bu kadar süre (ms) durunca 3D yeni yerine geçer. */
const SETTLE_MS = 160;
/** Kaydırma bu kadar süre (ms) durunca yarıda kalan bir geçiş tamamlanır. */
const IDLE_MS = 220;

/** Kaydırmayı 3D hikâyeye bağlar: sahnelerin (data-scene) konumlarını ölçer,
 *  görünüm alanının ortasından beat'i hesaplar; GSAP ile yumuşatır. Sayfa
 *  bir adımda bir sahneden fazla atlarsa (bağlantı, End tuşu) ya da 3D'nin
 *  zarifçe izleyebileceğinden hızlı kayarsa (hızlı fırlatma) 3D yarışmaz:
 *  olduğu yerde, aydınlık bekler; kaydırma durunca aradaki sahneleri
 *  oynatmadan yeni yerine geçer (story.jump). Işık ve parlaklık değişmez.
 *  Hareket azaltma açıksa beat her sahnenin okuma anına oturur, geçiş anidir. */
export function ScrollDriver() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Uçtan uca testler (scripts/e2e.mjs) 3D'nin durumunu buradan okur.
    if (params.has("e2e")) (window as unknown as { __story: typeof story }).__story = story;
    // Poster çekimi: WebGL'siz tarayıcılar için sahnenin sabit görüntüleri
    // (scripts/capture-posters.mjs). Metin gizlenir, beat dışarıdan verilir.
    const poster = params.get("poster");
    if (poster !== null) {
      story.poster = true;
      story.reduced = true;
      story.layout = layoutFor(window.innerWidth, window.innerHeight);
      story.beat = story.target = story.rest = Number(poster) || 0;
      document.documentElement.classList.add("poster-mode");
      (window as unknown as { setPosterBeat: (beat: number) => void }).setPosterBeat = (beat) => {
        story.beat = story.target = story.rest = beat;
      };
      return;
    }
    const reduced = prefersReducedMotion();
    story.reduced = reduced;
    let tops: number[] = [];
    let lastBottom = 0;

    const measure = () => {
      // Sahne işaretleri düzene göre değişir (geniş ekranda sabit sahnenin
      // içinde, dar ekranda bölümlerin başında); yalnız görünenler sayılır.
      const scenes = [...document.querySelectorAll<HTMLElement>("[data-scene]")].filter(
        (el) => el.getClientRects().length > 0,
      );
      tops = scenes.map((el) => el.getBoundingClientRect().top + window.scrollY);
      const last = scenes.at(-1);
      lastBottom = last ? last.getBoundingClientRect().bottom + window.scrollY : 0;
      story.layout = layoutFor(window.innerWidth, window.innerHeight);
    };

    // Tekerlek adımları kesik kesik gelir; 3D'de akıcı görünsün diye kısa bir
    // yumuşatma (GSAP). GSAP ilk boyamadan sonra gelir (motion.ts); o zamana
    // kadar 3D kaydırmayı doğrudan izler.
    let quick: ((value: number, start?: number) => void) | null = null;
    let alive = true;
    motionReady().then(({ gsap }) => {
      if (alive) quick = gsap.quickTo(story, "beat", { duration: 0.6, ease: "power3.out" });
    });
    const smooth = (value: number) => {
      if (quick) quick(value);
      else story.beat = value;
    };
    const current = () => beatFromScroll(window.scrollY + window.innerHeight / 2, tops, lastBottom);
    const hold = (beat: number) => {
      quick?.(beat, beat);
      story.beat = beat;
    };
    let racing = false;
    let settle = 0;
    let idle = 0;
    let speed = 0;
    let lastAt = performance.now();
    /** Kaydırmanın içinde durduğu geçiş: kaydırma bu aralıkta kaldıkça 3D
     *  geçişi tamamlanmış hâliyle (kenarda) bekler. */
    let parked: [number, number] | null = null;
    /** 3D'nin varacağı yer: geçişin ortasıysa tamamlandığı kenar. */
    const restAt = (beat: number) => {
      const resting = restingBeat(beat);
      parked = resting.zone;
      story.rest = resting.beat;
      return resting.beat;
    };
    /** Kaydırma durdu: yarıda kalan geçiş metnin gösterdiği sahneye tamamlanır. */
    const rest = () => {
      if (racing) return;
      smooth(restAt(story.target));
    };
    /** 3D kaydırmayla yarışmaz: o anki sahnede bekler, kaydırma durunca geçer. */
    const race = () => {
      if (!racing) hold(story.beat);
      racing = true;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        racing = false;
        speed = 0;
        const from = story.beat;
        const to = restAt(story.target);
        hold(to);
        if (from !== to) story.jump = { from, to, start: performance.now() };
      }, SETTLE_MS);
    };
    const update = () => {
      const previous = story.target;
      story.target = current();
      const now = performance.now();
      // Sahne/sn; tek bir olay hızı abartmasın diye yumuşatılır.
      speed = speed * 0.5 + (Math.abs(story.target - previous) / Math.max(0.001, (now - lastAt) / 1000)) * 0.5;
      lastAt = now;
      story.activeAt = now;
      window.clearTimeout(idle);
      if (reduced) story.beat = story.rest = Math.floor(story.target) + 0.5;
      else if (racing || isCut(previous, story.target) || speed > RACE_SPEED) race();
      else if (parked && story.target >= parked[0] && story.target <= parked[1]) {
        // Geçişin içinde kaydırılıyor: 3D tamamlanmış hâlde bekler; kaydırma
        // ortayı geçerse (metin öbür bölüme geçer) öbür kenara yumuşakça geçer.
        smooth(restAt(story.target));
      } else {
        parked = null;
        story.rest = story.target;
        smooth(story.target);
        idle = window.setTimeout(rest, IDLE_MS);
      }
    };

    measure();
    story.target = current();
    story.beat = story.rest = reduced ? Math.floor(story.target) + 0.5 : restAt(story.target);

    const onResize = () => {
      measure();
      update();
    };
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onPointer = (event: PointerEvent) => {
      story.activeAt = performance.now();
      story.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      story.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      alive = false;
      window.clearTimeout(settle);
      window.clearTimeout(idle);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);
  return null;
}
