import { ArrowRight } from "@/components/site/Icons.tsx";
import { getContent } from "@/lib/locale.ts";
import { links } from "@/lib/site.ts";

export async function FinalCta() {
  const { final } = await getContent();
  return (
    <section
      data-scene="final"
      aria-labelledby="final-title"
      className="scene relative flex min-h-[80svh] items-center py-32"
    >
      <div className="shell flex w-full flex-col items-center text-center">
        <h2
          id="final-title"
          className="display max-w-4xl text-[clamp(2.75rem,6.4vw,5.75rem)]"
          data-split
        >
          {final.title}
        </h2>
        <p className="mt-7 max-w-lg text-lg" data-reveal>
          {final.body}
        </p>
        <div className="mt-10" data-reveal>
          <a href={links.teacherStart} className="btn btn-primary h-14 px-7 text-base">
            {final.cta}
            <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
