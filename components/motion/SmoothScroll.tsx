"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { prefersReducedMotion } from "@/three/quality.ts";

gsap.registerPlugin(ScrollTrigger);

/** Sayfadaki tek Lenis örneği; bölüm atlamaları bunun üzerinden kayar. */
export const smooth: { lenis: Lenis | null } = { lenis: null };

/** Yumuşak, ataletli kaydırma (fare tekerleği ve dokunmatik yüzey). Lenis
 *  tarayıcının kendi kaydırma konumunu yumuşatır: sabitlenen bölüm (sticky),
 *  ScrollTrigger ve 3D köprüsü olduğu gibi çalışır. Dokunmatik ekranlarda
 *  kaydırma tarayıcıya bırakılır; hareket azaltmada hiç kurulmaz. */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: -72 } });
    smooth.lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      smooth.lenis = null;
    };
  }, []);
  return null;
}
