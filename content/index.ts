import type { Locale } from "../i18n/locales.ts";
import { tr } from "./tr.ts";
import { en } from "./en.ts";
import { de } from "./de.ts";
import { fr } from "./fr.ts";
import { es } from "./es.ts";
import { zh } from "./zh.ts";
import { ja } from "./ja.ts";

/** Türkçe kataloğun biçimi; metinler serbest, anahtarlar sabit. Uygulamadaki
 *  Messages tipiyle aynı desen (derslik: packages/contracts/src/i18n/index.ts). */
type Shape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly string[]
      ? readonly string[]
      : Shape<T[K]>;
};
export type Content = Shape<typeof tr>;

export const content: Record<Locale, Content> = { tr, en, de, fr, es, zh, ja };
