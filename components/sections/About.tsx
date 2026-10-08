import { Rich } from "@/components/site/Rich.tsx";
import { currentLocale, getContent } from "@/lib/locale.ts";
import { splitLabel } from "@/lib/text.ts";

export async function About() {
  const locale = await currentLocale();
  const { about } = await getContent();
  return (
    <section
      id="about"
      data-scene="about"
      className="scene relative flex min-h-svh items-center py-32"
    >
      <div className="shell grid w-full lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-6">
          <p className="eyebrow">{about.label}</p>
          {/* Bölümün başlığı: SplitText başlıklara aria-label koyar; blockquote'ta bu nitelik yasak. */}
          <h2 className="heading text-[clamp(2rem,3.7vw,3.25rem)]" data-split>
            {about.mission}
          </h2>
          <p className="text-lg" data-reveal>
            {about.body}
          </p>
          <p data-reveal>
            <Rich text={about.story} />
          </p>
          <ul className="border-t border-line" data-reveal>
            {about.values.map((value) => {
              const [name, text] = splitLabel(value, locale);
              return (
                <li key={value} className="flex gap-4 border-b border-line py-4">
                  <span className="w-28 shrink-0 font-medium text-ink">{name}</span>
                  <span className="text-muted">{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
