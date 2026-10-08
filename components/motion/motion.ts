"use client";
import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type { SplitText as SplitTextType } from "gsap/SplitText";

export type Motion = { gsap: typeof Gsap; ScrollTrigger: typeof ScrollTriggerType; SplitText: typeof SplitTextType };

/* GSAP (metin hareketleri, sabitlenen özellik sahnesi, kaydırma yumuşatma)
   ilk boyamada gerekmez; ilk yüklemenin en büyük parçalarından biridir.
   Tarayıcı boşalınca (en geç 1,5 sn) ya da ziyaretçi kaydırmaya, dokunmaya
   veya tuşa basmaya başlayınca yüklenir; bütün kullananlar aynı yüklemeyi
   bekler. Böylece mobilde en büyük içerik (LCP) bu kodu beklemez. */

const EVENTS = ["scroll", "wheel", "pointerdown", "touchstart", "keydown"] as const;
let ready: Promise<Motion> | null = null;

function load(): Promise<Motion> {
  return Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText")]).then(
    ([{ gsap }, { ScrollTrigger }, { SplitText }]) => {
      gsap.registerPlugin(ScrollTrigger, SplitText);
      return { gsap, ScrollTrigger, SplitText };
    },
  );
}

export function motionReady(): Promise<Motion> {
  ready ??= new Promise<void>((resolve) => {
    let idle = 0;
    const start = () => {
      for (const name of EVENTS) window.removeEventListener(name, start);
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      resolve();
    };
    for (const name of EVENTS) window.addEventListener(name, start, { passive: true, once: true });
    idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(start, { timeout: 1500 })
        : (setTimeout(start, 800) as unknown as number);
  }).then(load);
  return ready;
}
