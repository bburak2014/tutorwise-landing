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

/** Cihazın kaba gücü: zayıf cihazda efektler kapalı başlar, DPR düşük kalır. */
export function startingTier(): "high" | "low" {
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return cores <= 4 || (coarse && window.innerWidth < 768) ? "low" : "high";
}
