"use client";
import { useEffect, useRef } from "react";

/** Sayfa kaydırılınca üst menüye zemin verir (data-scrolled). */
export function HeaderFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      header.current?.toggleAttribute("data-scrolled", window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      ref={header}
      className="group fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500 border-b border-transparent data-scrolled:border-line data-scrolled:bg-deep/70 data-scrolled:backdrop-blur-xl"
    >
      {children}
    </header>
  );
}
