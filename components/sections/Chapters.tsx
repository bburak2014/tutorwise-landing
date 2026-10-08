import { Check } from "@/components/site/Icons.tsx";
import { getContent } from "@/lib/locale.ts";

/** Beş özellik bölümü. Her biri kitabın bir sayfası: 3D sahnede o bölümde
 *  bir sayfa döner ve sayfadan cihaz yükselir (data-scene ile bağlanır). */
export const chapterKeys = ["plan", "live", "homework", "packages", "family"] as const;

export async function Chapters() {
  const { chapters } = await getContent();
  return (
    <section id="features" aria-labelledby="features-title" className="relative">
      <div className="shell pb-8 pt-32 text-center">
        <p className="eyebrow">{chapters.label}</p>
        <h2
          id="features-title"
          className="display mx-auto mt-7 max-w-4xl text-[clamp(2.5rem,5.6vw,5rem)]"
          data-split
        >
          {chapters.title}
        </h2>
      </div>
      {chapterKeys.map((key, index) => {
        const chapter = chapters[key];
        return (
          <article
            key={key}
            id={`feature-${key}`}
            data-scene={`chapter-${key}`}
            className="relative flex min-h-svh items-center py-24"
          >
            <div className="shell grid w-full lg:grid-cols-12">
              <div className="lg:col-span-5" data-reveal>
                <div className="flex items-center gap-4">
                  <span className="font-display text-sm font-semibold tabular-nums text-marker">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px w-16 bg-line-strong" />
                </div>
                <h3 className="heading mt-6 text-[clamp(2rem,3.6vw,3.25rem)]">
                  {chapter.title}
                </h3>
                <p className="mt-6 text-lg">{chapter.body}</p>
                <ul className="mt-8 flex flex-col gap-3.5">
                  {chapter.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-marker/12 text-marker">
                        <Check className="size-3" />
                      </span>
                      <span className="text-ink/90">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
