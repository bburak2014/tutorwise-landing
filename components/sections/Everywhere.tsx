import { ArrowRight } from "@/components/site/Icons.tsx";
import { StoreBadges } from "@/components/site/StoreBadges.tsx";
import { getContent } from "@/lib/locale.ts";
import { links } from "@/lib/site.ts";

export async function Everywhere() {
  const { everywhere, store } = await getContent();
  return (
    <section
      id="download"
      data-scene="everywhere"
      aria-labelledby="download-title"
      className="scene relative flex min-h-svh items-center py-32"
    >
      <div className="shell flex w-full flex-col items-center text-center">
        <p className="eyebrow">{everywhere.label}</p>
        <h2
          id="download-title"
          className="display mt-7 max-w-4xl text-[clamp(2.5rem,5.6vw,5rem)]"
          data-split
        >
          {everywhere.title}
        </h2>
        <p className="mt-7 max-w-xl text-lg" data-reveal>
          {everywhere.body}
        </p>
        <div className="mt-10 flex flex-col items-center gap-6" data-reveal>
          <StoreBadges
            appStoreKicker={store.appStoreKicker}
            googlePlayKicker={store.googlePlayKicker}
          />
          <a href={links.webApp} className="link-arrow text-brand-strong">
            {everywhere.webCta}
            <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
