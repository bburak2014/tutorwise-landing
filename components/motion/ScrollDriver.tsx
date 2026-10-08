"use client";
import gsap from "gsap";
import { useEffect } from "react";
import { beatFromScroll } from "@/three/choreography.ts";
import { layoutFor, prefersReducedMotion } from "@/three/quality.ts";
import { story } from "@/three/story.ts";

/** Kaydırmayı 3D hikâyeye bağlar: sahnelerin (data-scene) konumlarını ölçer,
 *  görünüm alanının ortasından beat'i hesaplar; GSAP ile yumuşatır. Hareket
 *  azaltma açıksa beat her sahnenin okuma anına oturur, geçiş anidir. */
export function ScrollDriver() {
  useEffect(() => {
    // Poster çekimi: WebGL'siz tarayıcılar için sahnenin sabit görüntüleri
    // (scripts/capture-posters.mjs). Metin gizlenir, beat dışarıdan verilir.
    const poster = new URLSearchParams(window.location.search).get("poster");
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

    const smooth = gsap.quickTo(story, "beat", { duration: 1.1, ease: "power3.out" });
    const current = () => beatFromScroll(window.scrollY + window.innerHeight / 2, tops, lastBottom);
    const update = () => {
      story.target = current();
      if (reduced) story.beat = Math.floor(story.target) + 0.5;
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
      story.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      story.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);
  return null;
}
