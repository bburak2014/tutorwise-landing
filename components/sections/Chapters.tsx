import { ChapterStage } from "./ChapterStage.tsx";
import { getContent } from "@/lib/locale.ts";

/** Beş özellik bölümü. Her biri kitabın bir sayfası: 3D sahnede o bölümde
 *  bir sayfa döner ve sayfadan cihaz yükselir (ChapterStage). */
export const chapterKeys = ["plan", "live", "homework", "packages", "family"] as const;

export async function Chapters() {
  const { chapters } = await getContent();
  return (
    <section id="features" aria-labelledby="features-title" className="relative">
      {/* İlk özelliğin (ders planı) 3D sahnesi başlıktan başlar: menüden
          Özellikler'e gelince sahne iki nesne arasında boş kalmaz. */}
      <span data-scene="chapter-plan" aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px" />
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
      <ChapterStage
        railLabel={chapters.label}
        chapters={chapterKeys.map((key) => ({ key, ...chapters[key] }))}
      />
    </section>
  );
}
