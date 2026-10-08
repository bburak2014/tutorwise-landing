"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** İmleci izleyen yumuşak ışık olan cam kart. Işık CSS değişkenleriyle
 *  (--mx, --my) çizilir; kart yerinden oynamaz, React yeniden çizim yapmaz. */
export function SpotlightCard({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  const card = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = card.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(((event.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(((event.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
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
