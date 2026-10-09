import type { Layout } from "./choreography.ts";

/** Tarayıcı WebGL2 çizebiliyor mu? Çizemiyorsa 3D yüklenmez, poster kalır. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Dar ekranda (telefon, dik tablet) 3D nesne üstte ortalanır, metin altta akar. */
export function layoutFor(width: number, height: number): Layout {
  return width < 1024 || width / height < 1 ? "narrow" : "wide";
}

/** Cihaz sınıfı: güçlü bilgisayar (efektler, stüdyo HDRI'si), telefon
 *  (ekran yoğunluğunda, en fazla 2× çizim; efekt ve HDRI indirmesi yok) ya
 *  da zayıf cihaz (1×). Telefonlar çekirdek sayısına bakılmadan telefon
 *  sayılır: iOS çekirdek sayısını düşük bildirebilir, 1× çizim 3× ekranda
 *  bulanık görünür. Yavaş kalan cihazda çözünürlük sonradan düşer
 *  (Experience → FrameScheduler). */
export type Tier = "high" | "phone" | "low";

export function startingTier(): Tier {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse && window.innerWidth < 768) return "phone";
  const cores = navigator.hardwareConcurrency ?? 4;
  return cores <= 4 ? "low" : "high";
}
