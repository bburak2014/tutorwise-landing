import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { content } from "@/content/index.ts";
import { isLocale, type Locale } from "@/i18n/locales.ts";

/** Sayfanın dili, `app/[locale]` kök parametresinden. */
export async function currentLocale(): Promise<Locale> {
  const value = await rootLocale();
  if (!value || !isLocale(value)) notFound();
  return value;
}

/** Sayfanın dilindeki metinler (yalnız sunucu bileşenlerinde). */
export async function getContent() {
  return content[await currentLocale()];
}
