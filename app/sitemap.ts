import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales.ts";
import { site } from "@/lib/site.ts";

export const dynamic = "force-static";

/** Her dildeki sayfalar (ana sayfa, gizlilik, koşullar), diğer dillerdeki
 *  karşılıklarıyla birlikte. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1, changeFrequency: "monthly" },
    { path: "privacy/", priority: 0.3, changeFrequency: "yearly" },
    { path: "terms/", priority: 0.3, changeFrequency: "yearly" },
  ] as const;
  return pages.flatMap(({ path, priority, changeFrequency }) => {
    const languages = Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}/${path}`]));
    return locales.map((locale) => ({
      url: `${site.url}/${locale}/${path}`,
      changeFrequency,
      priority: locale === "tr" || path ? priority : priority * 0.8,
      alternates: { languages },
    }));
  });
}
