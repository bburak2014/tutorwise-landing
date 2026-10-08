import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales.ts";
import { site } from "@/lib/site.ts";

export const dynamic = "force-static";

/** Her dil sayfası, diğer dillerdeki karşılıklarıyla birlikte. */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}/`]));
  return locales.map((locale) => ({
    url: `${site.url}/${locale}/`,
    changeFrequency: "monthly",
    priority: locale === "tr" ? 1 : 0.8,
    alternates: { languages },
  }));
}
