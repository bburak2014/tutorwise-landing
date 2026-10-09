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
      {/* Başlık diğer bölümler gibi sol sütunda: sağ yarı 3D nesnenin (takvim)
          yeri; başlık ortalansaydı nesne üstüne binerdi. Telefonda 3D ekranın
          üst kısmında durur; başlık onun altından başlar. */}
      <div className="shell grid pb-8 pt-[45svh] lg:grid-cols-12 lg:pt-32">
        <div className="lg:col-span-6">
          <p className="eyebrow">{chapters.label}</p>
          <h2 id="features-title" className="display mt-7 text-[clamp(2.5rem,4.6vw,4.4rem)]" data-split>
            {chapters.title}
          </h2>
        </div>
      </div>
      <ChapterStage
        railLabel={chapters.label}
        chapters={chapterKeys.map((key) => ({ key, ...chapters[key] }))}
      />
    </section>
  );
}
