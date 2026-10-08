import type { Metadata } from "next";
import { Fragment } from "react";
import { Footer } from "@/components/site/Footer.tsx";
import { Header } from "@/components/site/Header.tsx";
import { InertLinks } from "@/components/site/InertLinks.tsx";
import { legal } from "@/content/legal/index.ts";
import { intlTags, locales } from "@/i18n/locales.ts";
import { currentLocale } from "@/lib/locale.ts";
import { site } from "@/lib/site.ts";

export type LegalPageName = "privacy" | "terms";

/** Metindeki iletişim adresini e-posta bağlantısına çevirir. */
function withMailLinks(text: string) {
  const parts = text.split(site.email);
  return parts.map((part, i) => (
    <Fragment key={`${i}:${part}`}>
      {part}
      {i < parts.length - 1 && (
        <a href={`mailto:${site.email}`} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {site.email}
        </a>
      )}
    </Fragment>
  ));
}

/** Sayfanın başlığı, açıklaması, canonical adresi ve diğer dillerdeki karşılıkları. */
export async function legalMetadata(page: LegalPageName): Promise<Metadata> {
  const locale = await currentLocale();
  const doc = legal[locale][page];
  const path = `/${locale}/${page}/`;
  const title = `${doc.title} · ${site.name}`;
  return {
    title,
    description: doc.description,
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/${page}/`])),
        "x-default": `/en/${page}/`,
      },
    },
    openGraph: {
      type: "article",
      siteName: site.name,
      title,
      description: doc.description,
      url: path,
      locale: intlTags[locale].replace("-", "_"),
      images: [{ url: `/og/${locale}.jpg`, width: 1200, height: 630, alt: title }],
    },
  };
}

/** Gizlilik politikası ya da kullanım koşulları: düz, okunur bir metin
 *  sayfası (3D sahne yok). Bölümler numaralı ve bağlantılı. */
export async function LegalPage({ page }: Readonly<{ page: LegalPageName }>) {
  const locale = await currentLocale();
  const texts = legal[locale];
  const doc = texts[page];
  return (
    <>
      <InertLinks />
      <Header page={`${page}/`} />
      <main id="main" className="relative z-10 pt-[var(--header-h)]">
        <article className="shell py-14 md:py-20">
          <div className="mx-auto max-w-3xl">
            <a href={`/${locale}/`} className="text-sm text-muted transition-colors hover:text-ink">
              ← {texts.home}
            </a>
            <h1 className="display mt-8 text-[clamp(2.3rem,5vw,3.5rem)]">{doc.title}</h1>
            <p className="mt-4 text-sm text-muted">{texts.updated}</p>
            <p className="mt-8 text-lg leading-relaxed text-text">{doc.intro}</p>

            <nav aria-label={texts.contents} className="mt-10 rounded-2xl border border-line bg-white/[0.02] p-6">
              <p className="text-sm font-medium text-ink">{texts.contents}</p>
              <ol className="mt-4 grid gap-x-8 gap-y-2 text-sm text-muted sm:grid-cols-2">
                {doc.sections.map((section, i) => (
                  <li key={section.title}>
                    <a href={`#s${i + 1}`} className="transition-colors hover:text-ink">
                      {i + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {doc.sections.map((section, i) => (
              <section
                key={section.title}
                id={`s${i + 1}`}
                aria-labelledby={`s${i + 1}-title`}
                className="mt-14 scroll-mt-[calc(var(--header-h)+1.5rem)]"
              >
                <h2 id={`s${i + 1}-title`} className="heading text-[1.6rem]">
                  {i + 1}. {section.title}
                </h2>
                {section.body.map((block) =>
                  typeof block === "string" ? (
                    <p key={block} className="mt-4 leading-relaxed text-text">
                      {withMailLinks(block)}
                    </p>
                  ) : (
                    <ul key={block.join("|")} className="mt-4 list-disc space-y-2.5 pl-5 leading-relaxed text-text marker:text-brand">
                      {block.map((item) => (
                        <li key={item}>{withMailLinks(item)}</li>
                      ))}
                    </ul>
                  ),
                )}
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer page={`${page}/`} />
    </>
  );
}
