"use client";
import { useEffect } from "react";
import { prefersReducedMotion } from "@/three/quality.ts";
import { motionReady, type Motion } from "./motion.ts";

const below = (el: HTMLElement) => el.getBoundingClientRect().top > window.innerHeight;

/** Kurulanları geri alan bir işlev döndürür. */
function revealText({ gsap, ScrollTrigger, SplitText }: Motion) {
  const root = document.documentElement;
  const ctx = gsap.context(() => {
    const rest = gsap.utils.toArray<HTMLElement>("[data-reveal]").filter((el) => !el.closest("#top") && below(el));
    gsap.set(rest, { autoAlpha: 0, y: 34 });
    ScrollTrigger.batch(rest, {
      start: "top 88%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }),
    });
  });

  // Başlıklar görünüme yaklaşınca bölünür: hepsini açılışta bölmek
  // satırları ölçtüğü için ana iş parçacığını uzun süre meşgul ediyordu.
  const cjk = /^(zh|ja)/.test(root.lang);
  const animate = (heading: HTMLElement, self: SplitText) =>
    gsap.from(cjk ? self.chars : self.words, {
      yPercent: cjk ? 0 : 110,
      autoAlpha: cjk ? 0 : 1,
      duration: 1.2,
      ease: "expo.out",
      stagger: cjk ? 0.025 : 0.045,
      scrollTrigger: { trigger: heading, start: "top 85%", once: true },
    });
  const split = (heading: HTMLElement) =>
    ctx.add(() => {
      SplitText.create(heading, {
        type: cjk ? "chars" : "words,lines",
        mask: cjk ? undefined : "lines",
        autoSplit: true,
        onSplit: (self) => animate(heading, self),
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
  // Zaten ekranda olan başlık bölünüp yeniden açılmaz (okunurken kaymasın).
  for (const heading of gsap.utils.toArray<HTMLElement>("[data-split]")) if (below(heading)) observer.observe(heading);
  return () => {
    observer.disconnect();
    ctx.revert();
  };
}

/** Metin hareketleri (GSAP, ilk boyamadan sonra yüklenir; motion.ts):
 *  - açılıştaki [data-reveal] öğeleri CSS ile gelir (globals.css, hero-in);
 *  - diğer [data-reveal] öğeleri görünüme girerken aşağıdan süzülür; GSAP
 *    gelmeden önce zaten ekranda olanlar olduğu gibi kalır (yanıp sönmez);
 *  - [data-split] başlıklar kelime kelime (Çince/Japoncada harf harf) açılır.
 *  Hareket azaltma açıksa hiçbiri çalışmaz, metin olduğu gibi görünür. */
export function Reveal() {
  useEffect(() => {
    if (prefersReducedMotion()) {
      document.documentElement.classList.add("motion-done");
      return;
    }
    let cancelled = false;
    let revert = () => {};
    motionReady().then((motion) => {
      if (!cancelled) revert = revealText(motion);
    });
    return () => {
      cancelled = true;
      revert();
    };
  }, []);
  return null;
}
