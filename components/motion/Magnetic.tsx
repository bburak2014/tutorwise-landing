"use client";
import gsap from "gsap";
import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/three/quality.ts";

/** İmlece hafifçe çekilen düğme: yakınındaki imleç düğmeyi birkaç piksel
 *  kendine doğru çeker, imleç uzaklaşınca yaylanarak yerine döner. Yalnız
 *  hassas işaretçide (fare) ve hareket azaltma kapalıyken. */
export function Magnetic({ children, strength = 0.28 }: Readonly<{ children: ReactNode; strength?: number }>) {
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    const reach = 60;
    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const near =
        Math.abs(dx) < box.width / 2 + reach && Math.abs(dy) < box.height / 2 + reach;
      x(near ? dx * strength : 0);
      y(near ? dy * strength : 0);
    };
    const reset = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", reset);
    };
  }, [strength]);

  return (
    <span ref={wrap} className="inline-flex will-change-transform">
      {children}
    </span>
  );
}
