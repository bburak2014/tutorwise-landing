"use client";
import gsap from "gsap";
import { useEffect } from "react";
import { beatFromScroll, isCut } from "@/three/choreography.ts";
import { layoutFor, prefersReducedMotion } from "@/three/quality.ts";
import { story } from "@/three/story.ts";

/** 3D'nin zarifçe izleyebileceği en yüksek kaydırma hızı (sahne/sn). */
const RACE_SPEED = 3;
const DIM = 0.15;

/** Kaydırmayı 3D hikâyeye bağlar: sahnelerin (data-scene) konumlarını ölçer,
 *  görünüm alanının ortasından beat'i hesaplar; GSAP ile yumuşatır. Sayfa
 *  bir adımda bir sahneden fazla atlarsa (bağlantı, End tuşu) ya da 3D'nin
 *  zarifçe izleyebileceğinden hızlı kayarsa (hızlı fırlatma) 3D yarışmaz:
 *  kararır, kaydırmayı anında izler ve kaydırma durunca yeni yerinde belirir.
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
      story.beat = story.target = Number(poster) || 0;
      document.documentElement.classList.add("poster-mode");
      (window as unknown as { setPosterBeat: (beat: number) => void }).setPosterBeat = (beat) => {
        story.beat = story.target = beat;
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

    // Tekerlek adımları kesik kesik gelir; 3D'de akıcı görünsün diye kısa bir yumuşatma.
    const smooth = gsap.quickTo(story, "beat", { duration: 0.6, ease: "power3.out" });
    const current = () => beatFromScroll(window.scrollY + window.innerHeight / 2, tops, lastBottom);
    const stage = () => document.querySelector<HTMLElement>(".stage");
    const fade = (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const el = stage();
      if (!el) return;
      for (const animation of el.getAnimations()) animation.cancel();
      el.animate(keyframes, options);
    };
    let racing = false;
    let settle = 0;
    let speed = 0;
    let lastAt = performance.now();
    /** 3D karanlıkta kaydırmayı anında izler; kaydırma durunca belirir. */
    const race = () => {
      if (!racing) fade([{ opacity: DIM }, { opacity: DIM }], { duration: 1, fill: "forwards" });
      racing = true;
      smooth(story.target, story.target);
      story.beat = story.target;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        racing = false;
        speed = 0;
        fade([{ opacity: DIM }, { opacity: 1 }], { duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
      }, 160);
    };
    const update = () => {
      const previous = story.target;
      story.target = current();
      const now = performance.now();
      // Sahne/sn; tek bir olay hızı abartmasın diye yumuşatılır.
      speed = speed * 0.5 + (Math.abs(story.target - previous) / Math.max(0.001, (now - lastAt) / 1000)) * 0.5;
      lastAt = now;
      story.activeAt = now;
      if (reduced) story.beat = Math.floor(story.target) + 0.5;
      else if (racing || isCut(previous, story.target) || speed > RACE_SPEED) race();
      else smooth(story.target);
    };

    measure();
    story.target = current();
    story.beat = reduced ? Math.floor(story.target) + 0.5 : story.target;

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
      window.clearTimeout(settle);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);
  return null;
}
