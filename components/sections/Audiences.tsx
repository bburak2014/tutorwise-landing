import { SpotlightCard } from "@/components/motion/SpotlightCard.tsx";
import { ArrowRight } from "@/components/site/Icons.tsx";
import { getContent } from "@/lib/locale.ts";
import { links } from "@/lib/site.ts";

export async function Audiences() {
  const { audiences } = await getContent();
  const cards = [
    { ...audiences.teacher, href: links.teacherStart },
    { ...audiences.student, href: links.studentSignIn },
    { ...audiences.guardian, href: "#download" },
  ];
  return (
    <section
      id="audiences"
      data-scene="audiences"
      aria-labelledby="audiences-title"
      className="scene relative flex min-h-svh items-center py-32"
    >
      <div className="shell w-full">
        <div className="max-w-3xl">
          <p className="eyebrow">{audiences.label}</p>
          <h2
            id="audiences-title"
            className="display mt-7 text-[clamp(2.5rem,5.2vw,4.75rem)]"
            data-split
          >
            {audiences.title}
          </h2>
        </div>
        <ul className="mt-16 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <li key={card.title} data-reveal>
              <SpotlightCard href={card.href}>
                <h3 className="heading text-3xl">{card.title}</h3>
                <p className="mt-4 flex-1 text-text">{card.body}</p>
                <span className="link-arrow mt-10">
                  {card.cta}
                  <ArrowRight />
                </span>
              </SpotlightCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
