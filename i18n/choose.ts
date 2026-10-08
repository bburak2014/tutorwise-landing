import {
  LOCALE_COOKIE,
  fallbackLocale,
  locales,
  type Locale,
} from "./locales.ts";

/** Kök sayfadaki dil seçimi, uygulamadaki sırayla: önce dil çerezi, sonra
 *  tarayıcının dilleri, en sonda yedek dil. Bu fonksiyon `<head>` içine
 *  metin olarak gömülür; bu yüzden dışarıdan hiçbir şeye başvurmaz. */
export function chooseLocale(
  cookie: string,
  languages: readonly string[],
  supported: readonly string[],
  fallback: string,
  cookieName: string,
): string {
  const base = (tag: string) =>
    tag.trim().toLowerCase().replace("_", "-").split("-")[0];
  const pair = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + "="));
  const fromCookie = pair ? pair.slice(cookieName.length + 1) : "";
  for (const tag of [fromCookie, ...languages]) {
    const hit = base(tag);
    if (supported.includes(hit)) return hit;
  }
  return fallback;
}

/** `/` sayfasının `<head>` betiği: dili seçip o dilin sayfasına geçer. */
export const redirectScript =
  `location.replace("/"+(${chooseLocale.toString()})(` +
  `document.cookie,navigator.languages||[navigator.language||""],` +
  `${JSON.stringify(locales)},${JSON.stringify(fallbackLocale)},` +
  `${JSON.stringify(LOCALE_COOKIE)})+"/")`;

/** Dil seçicinin yazdığı çerez; biçim uygulamadakiyle aynı, üstüne Secure.
 *  Alan adı verilirse landing ile uygulama (alt alan adları) çerezi paylaşır. */
export function localeCookie(locale: Locale, domain: string): string {
  const cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  return domain ? `${cookie}; Domain=${domain}` : cookie;
}
