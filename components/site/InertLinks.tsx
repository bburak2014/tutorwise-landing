"use client";
import { useEffect } from "react";

/** Adresi henüz belli olmayan bağlantılar `lib/site.ts`'te "#". Tarayıcı
 *  "#"e basınca sayfanın en başına atlar; burada o atlama engellenir, sayfa
 *  ve 3D olduğu yerde kalır. Gerçek adres gelince bağlantı kendiliğinden
 *  çalışır. */
export function InertLinks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a[href="#"]')) event.preventDefault();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
