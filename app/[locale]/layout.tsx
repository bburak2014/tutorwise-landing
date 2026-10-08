import type { Metadata, Viewport } from "next";
import "../globals.css";
import { content } from "@/content/index.ts";
import { intlTags, locales } from "@/i18n/locales.ts";
import { fontVariables } from "@/lib/fonts.ts";
import { currentLocale } from "@/lib/locale.ts";
import { site } from "@/lib/site.ts";

// Yalnız bu yedi dil derlenir; başka bir yol 404 olur.
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#060918",
  colorScheme: "dark",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const { meta } = content[locale];
  return {
    metadataBase: new URL(site.url),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/`])),
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: meta.title,
      description: meta.description,
      url: `/${locale}/`,
      locale: intlTags[locale].replace("-", "_"),
      images: [{ url: `/og/${locale}.jpg`, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [`/og/${locale}.jpg`],
    },
    icons: { icon: "/favicon.svg" },
  };
}

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await currentLocale();
  return (
    <html lang={locale} className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
