import type { Locale } from "../../i18n/locales.ts";
import { de } from "./de.ts";
import { en } from "./en.ts";
import { es } from "./es.ts";
import { fr } from "./fr.ts";
import { ja } from "./ja.ts";
import { tr } from "./tr.ts";
import type { Legal } from "./types.ts";
import { zh } from "./zh.ts";

export type { Block, Legal, LegalDoc } from "./types.ts";

/** Gizlilik politikası ve kullanım koşulları, yedi dilde. */
export const legal: Record<Locale, Legal> = { tr, en, de, fr, es, zh, ja };
