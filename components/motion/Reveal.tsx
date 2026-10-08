"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion } from "@/three/quality.ts";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/** Metin hareketleri (GSAP):
 *  - açılıştaki [data-reveal] öğeleri CSS ile gelir (globals.css, hero-in);
 *  - diğer [data-reveal] öğeleri görünüme girerken aşağıdan süzülür;
 *  - [data-split] başlıklar kelime kelime (Çince/Japoncada harf harf) açılır.
 *  Hareket azaltma açıksa hiçbiri çalışmaz, metin olduğu gibi görünür. */
export function Reveal() {
  useGSAP((_, contextSafe) => {
    const root = document.documentElement;
    if (prefersReducedMotion()) {
      root.classList.add("motion-done");
      return;
    }

    const rest = gsap.utils.toArray<HTMLElement>("[data-reveal]").filter((el) => !el.closest("#top"));
    gsap.set(rest, { autoAlpha: 0, y: 34 });
    ScrollTrigger.batch(rest, {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }),
    });

    // Başlıklar görünüme yaklaşınca bölünür: hepsini açılışta bölmek
    // satırları ölçtüğü için ana iş parçacığını uzun süre meşgul ediyordu.
    const cjk = /^(zh|ja)/.test(root.lang);
    const safe = contextSafe ?? (<T,>(fn: T) => fn);
    const split = safe((heading: HTMLElement) => {
      SplitText.create(heading, {
        type: cjk ? "chars" : "words,lines",
        mask: cjk ? undefined : "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(cjk ? self.chars : self.words, {
            yPercent: cjk ? 0 : 110,
            autoAlpha: cjk ? 0 : 1,
            duration: 1.2,
            ease: "expo.out",
            stagger: cjk ? 0.025 : 0.045,
            scrollTrigger: { trigger: heading, start: "top 85%", once: true },
          }),
      });
    });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          split(entry.target as HTMLElement);
        }
      },
      { rootMargin: "0px 0px 60% 0px" },
    );
    for (const heading of gsap.utils.toArray<HTMLElement>("[data-split]")) observer.observe(heading);
    return () => observer.disconnect();
  });
  return null;
}
