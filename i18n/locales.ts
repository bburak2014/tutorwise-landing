/* Kaynak: derslik deposu, packages/contracts/src/i18n/core.ts.
   Landing ayrı bir depo olduğu için paketi içe aktaramaz; uygulamayla aynı
   dilleri ve aynı eşleme kurallarını kullanmak için buraya kopyalandı.
   Uygulamada bir dil eklenirse burası da güncellenir. */

/** Desteklenen diller. Kaynak dil Türkçe. */
export const locales = ["tr", "en", "de", "fr", "es", "zh", "ja"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";
/** Tarayıcı desteklenmeyen bir dil söylediğinde. */
export const fallbackLocale: Locale = "en";

/** Her dil kendi adıyla gösterilir; seçicide kullanıcı kendi dilini tanır. */
export const localeNames: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  zh: "简体中文",
  ja: "日本語",
};

/** Intl biçimlendiricilerine ve og:locale'e verilen bölge etiketleri. */
export const intlTags: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  zh: "zh-CN",
  ja: "ja-JP",
};

/** Uygulamanın dil çerezi. Aynı alan adında landing ve uygulama aynı dili görür. */
export const LOCALE_COOKIE = "derslik-locale";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** "zh-Hans-CN", "en_US", "DE" gibi etiketleri desteklenen dile indirger. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().replace("_", "-").split("-")[0];
  return isLocale(base) ? base : null;
}

/** Accept-Language başlığından en uygun dili seçer. */
export function negotiateLocale(
  header: string | null | undefined,
  fallback: Locale = fallbackLocale,
): Locale {
  if (!header) return fallback;
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag, q: q ? Number(q.trim().slice(2)) || 0 : 1, i };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const hit = matchLocale(tag);
    if (hit) return hit;
  }
  return fallback;
}
