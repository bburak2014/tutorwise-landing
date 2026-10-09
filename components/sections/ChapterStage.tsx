"use client";
import { useEffect, useRef, useState } from "react";
import { motionReady, type Motion } from "@/components/motion/motion.ts";
import { Check } from "@/components/site/Icons.tsx";
import { chapterIndex } from "@/three/choreography.ts";
import { prefersReducedMotion } from "@/three/quality.ts";

export type ChapterText = { key: string; title: string; body: string; points: readonly string[] };

/** Özellikler: geniş ekranda beş özellik tek, sabitlenmiş bir sahnede
 *  anlatılır. Kaydırdıkça 3D'de nesne bir sonrakine dönüşür, soldaki metin maskeli bir
 *  geçişle değişir, ilerleme çizgisi dolar. Sahnenin yüksekliği beş ekran;
 *  her özelliğin başında görünmez bir sahne işareti (data-scene) var, 3D
 *  hikâye bunlardan beslenir. Dar ekranda bölümler alt alta akar ve her
 *  bölümün kendi işareti vardır. */
export function ChapterStage({ chapters, railLabel }: Readonly<{ chapters: ChapterText[]; railLabel: string }>) {
  const wrapper = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const current = useRef(0);

  // GSAP ilk boyamadan sonra gelir (motion.ts); o zamana kadar ilk özellik
  // görünür, sahne işaretleri 3D'yi zaten besler.
  useEffect(() => {
    let cancelled = false;
    let revert = () => {};
    motionReady().then((motion) => {
      if (cancelled || !wrapper.current) return;
      revert = pinChapters(motion, wrapper.current, fill.current, current, setActive);
    });
    return () => {
      cancelled = true;
      revert();
    };
  }, []);

  /** Çizgideki numaraya basınca o özelliğin başına atlar. Komşu özellikte
   *  3D sayfayı çevirir; uzaktakine kesmeyle geçer (ScrollDriver). */
  const jump = (index: number) => {
    const marker = wrapper.current?.querySelectorAll<HTMLElement>("[data-marker]")[index];
    if (!marker) return;
    window.scrollTo({ top: marker.getBoundingClientRect().top + window.scrollY + 2, behavior: "instant" });
  };

  return (
    <div ref={wrapper} className="relative lg:h-[500svh]">
      {chapters.map((chapter, i) => (
        <span
          key={chapter.key}
          data-marker
          // İlk özelliğin sahnesi bölümün başlığından başlar (Chapters.tsx);
          // buradaki işaret yalnız bölüm çizgisindeki 01 için.
          data-scene={i === 0 ? undefined : `chapter-${chapter.key}`}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 hidden h-px w-px lg:block"
          style={{ top: `${i * 100}svh` }}
        />
      ))}
      <div className="lg:sticky lg:top-0 lg:h-svh">
        <div className="shell relative lg:grid lg:h-full lg:grid-cols-12 lg:items-center">
          <nav aria-label={railLabel} className="hidden lg:col-span-1 lg:flex lg:justify-start">
            <div className="relative flex h-[46svh] max-h-80 flex-col justify-between py-1">
              <span className="absolute left-[7px] top-0 h-full w-px bg-line-strong" aria-hidden="true" />
              <span
                ref={fill}
                className="absolute left-[7px] top-0 h-full w-px origin-top bg-marker shadow-[0_0_12px_rgb(255_216_74/0.7)]"
                aria-hidden="true"
              />
              {chapters.map((chapter, i) => (
                <button
                  key={chapter.key}
                  type="button"
                  onClick={() => jump(i)}
                  aria-label={chapter.title}
                  aria-current={i === active ? "step" : undefined}
                  className="group relative flex items-center gap-3 text-left"
                >
                  <span
                    className={`relative z-10 size-[15px] rounded-full border transition-colors duration-500 ${
                      i <= active ? "border-marker bg-marker" : "border-line-strong bg-deep"
                    }`}
                  />
                  <span
                    className={`font-display text-sm tabular-nums transition-colors duration-500 ${
                      i === active ? "text-marker" : "text-muted group-hover:text-ink"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          </nav>
          <div className="relative lg:col-span-5 lg:h-[64svh]">
            {chapters.map((chapter, i) => (
              <article
                key={chapter.key}
                id={`feature-${chapter.key}`}
                data-chapter
                className="scene chapter relative flex min-h-svh items-center py-24 lg:absolute lg:inset-0 lg:min-h-0 lg:py-0"
              >
                {i > 0 && (
                  <span data-scene={`chapter-${chapter.key}`} aria-hidden="true" className="absolute top-0 lg:hidden" />
                )}
                <span
                  aria-hidden="true"
                  className="chapter-numeral pointer-events-none absolute -left-8 -top-[0.42em] hidden select-none font-display text-[clamp(10rem,18vw,17rem)] font-semibold leading-none lg:block"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative w-full">
                  <div className="overflow-hidden">
                    <div data-line className="flex items-center gap-4">
                      <span className="font-display text-sm font-semibold tabular-nums text-marker">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="h-px w-16 bg-line-strong" />
                    </div>
                  </div>
                  <div className="overflow-hidden pb-[0.12em]">
                    <h3 data-line className="heading mt-6 text-[clamp(2rem,3.6vw,3.25rem)]">
                      {chapter.title}
                    </h3>
                  </div>
                  <div className="overflow-hidden">
                    <p data-line className="mt-6 text-lg">
                      {chapter.body}
                    </p>
                  </div>
                  <ul className="mt-8 flex flex-col gap-3.5">
                    {chapter.points.map((point) => (
                      <li key={point} className="overflow-hidden">
                        <div data-line className="flex items-start gap-3">
                          <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-marker/12 text-marker">
                            <Check className="size-3" />
                          </span>
                          <span className="text-ink/90">{point}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Geniş ekranda özellik metinlerinin geçişi ve ilerleme çizgisi (GSAP).
 *  Kurulanları geri alan bir işlev döndürür. */
function pinChapters(
  { gsap, ScrollTrigger }: Motion,
  wrapper: HTMLDivElement,
  fill: HTMLSpanElement | null,
  current: { current: number },
  setActive: (index: number) => void,
) {
  const reduced = prefersReducedMotion();
  const ctx = gsap.context(() => {}, wrapper);
  // Sonradan (kaydırırken) kurulan animasyonlar da bağlama kaydolsun.
  const safe =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) =>
      ctx.add(() => fn(...args));
  const media = gsap.matchMedia();
  media.add("(min-width: 1024px)", () => {
    const articles = gsap.utils.toArray<HTMLElement>("[data-chapter]", wrapper);
    const lines = (i: number) => articles[i].querySelectorAll<HTMLElement>("[data-line]");
    const only = (index: number) => (i: number) => (i === index ? 1 : 0);
    gsap.set(articles, { autoAlpha: only(0) });

    const show = safe((next: number) => {
      const previous = current.current;
      if (next === previous) return;
      current.current = next;
      setActive(next);
      if (reduced) {
        gsap.set(articles, { autoAlpha: only(next) });
        return;
      }
      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      tl.to(lines(previous), { yPercent: -105, duration: 0.45, ease: "power3.in", stagger: 0.03 })
        .set(articles[previous], { autoAlpha: 0 })
        .set(articles[next], { autoAlpha: 1 })
        .fromTo(lines(next), { yPercent: 105 }, { yPercent: 0, duration: 0.95, ease: "expo.out", stagger: 0.055 });
    });

    ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => show(chapterIndex(self.progress, articles.length)),
    });
    if (fill)
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: wrapper, start: "top top", end: "bottom bottom", scrub: true },
        },
      );
    return () => {
      gsap.set(articles, { clearProps: "all" });
      gsap.set(
        articles.flatMap((_a, i) => [...lines(i)]),
        { clearProps: "all" },
      );
    };
  });
  return () => {
    media.revert();
    ctx.revert();
  };
}
