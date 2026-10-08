import type { CSSProperties } from "react";
import { Magnetic } from "@/components/motion/Magnetic.tsx";
import { StoreBadges } from "@/components/site/StoreBadges.tsx";
import { ArrowRight } from "@/components/site/Icons.tsx";
import { getContent } from "@/lib/locale.ts";
import { links } from "@/lib/site.ts";

export async function Hero() {
  const { hero, store } = await getContent();
  return (
    <section
      id="top"
      data-scene="hero"
      className="scene relative flex min-h-svh items-center pt-[var(--header-h)]"
    >
      <div className="shell grid w-full lg:grid-cols-12">
        <div className="lg:col-span-8 xl:col-span-7">
          <p className="eyebrow" data-reveal style={{ "--i": 0 } as CSSProperties}>
            {hero.eyebrow}
          </p>
          <h1 className="display mt-6 text-[clamp(2.9rem,6.2vw,5.9rem)]">
            <span className="block" data-reveal style={{ "--i": 1 } as CSSProperties}>
              {hero.titleLead}
            </span>
            <span
              className="block bg-gradient-to-r from-ink via-brand-strong to-brand bg-clip-text pb-[0.08em] text-transparent"
              data-reveal style={{ "--i": 2 } as CSSProperties}
            >
              {hero.titleTail}
            </span>
          </h1>
          <p className="mt-7 max-w-[34rem] text-lg text-text" data-reveal style={{ "--i": 3 } as CSSProperties}>
            {hero.body}
          </p>
          <div className="mt-9 flex flex-wrap gap-3" data-reveal style={{ "--i": 4 } as CSSProperties}>
            <Magnetic>
              <a href={links.teacherStart} className="btn btn-primary">
                {hero.teacherCta}
                <ArrowRight />
              </a>
            </Magnetic>
            <a href={links.studentSignIn} className="btn btn-ghost">
              {hero.studentCta}
            </a>
          </div>
          <div className="mt-10 flex flex-col gap-3" data-reveal style={{ "--i": 5 } as CSSProperties}>
            <p className="text-sm text-muted">{hero.platforms}</p>
            <StoreBadges
              appStoreKicker={store.appStoreKicker}
              googlePlayKicker={store.googlePlayKicker}
            />
          </div>
        </div>
      </div>
      <a
        href="#about"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-ink md:flex"
      >
        {hero.scroll}
        <span className="relative block h-12 w-px overflow-hidden bg-line">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.4s_var(--ease-out-expo)_infinite] bg-marker" />
        </span>
      </a>
    </section>
  );
}
