import { intlTags, type Locale } from "../i18n/locales.ts";

/** İlk harfi dilin kuralıyla büyütür (Türkçede i → İ). */
export function capitalize(text: string, locale: Locale): string {
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase(intlTags[locale]) + text.slice(1);
}

/** "Ad: açıklama" biçimindeki değeri ikiye ayırır; açıklama büyük harfle
 *  başlar. Fransızcadaki boşluklu iki nokta ve tam genişlikli "：" de olur. */
export function splitLabel(value: string, locale: Locale): [string, string] {
  const at = value.search(/[:：]/);
  if (at < 0) return [value.trim(), ""];
  return [value.slice(0, at).trim(), capitalize(value.slice(at + 1).trim(), locale)];
}
