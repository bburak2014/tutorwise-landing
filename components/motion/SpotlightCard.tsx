"use client";
import gsap from "gsap";
import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/three/quality.ts";

/** İmleci izleyen yumuşak ışık ve hafif 3D eğilme olan cam kart. Işık CSS
 *  değişkenleriyle (--mx, --my) çizilir; React yeniden çizim yapmaz.
 *  Hareket azaltmada yalnız ışık kalır, eğilme olmaz. */
export function SpotlightCard({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  const card = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = card.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const tilt = !prefersReducedMotion();
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "power3.out" });
    gsap.set(el, { transformPerspective: 900 });
    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;
      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      if (tilt) {
        rx((0.5 - py) * 7);
        ry((px - 0.5) * 9);
      }
    };
    const onLeave = () => {
      if (tilt) {
        rx(0);
        ry(0);
      }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <a
      ref={card}
      href={href}
      className="glass spotlight group flex h-full flex-col rounded-3xl p-8 transition-colors hover:border-line-strong"
    >
      {children}
    </a>
  );
}
