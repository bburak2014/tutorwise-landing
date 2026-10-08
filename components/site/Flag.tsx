import { localeFlags } from "@/i18n/flags.ts";
import type { Locale } from "@/i18n/locales.ts";

/** Uygulamadaki bayrak (derslik: apps/web/components/i18n/flag.tsx). */
export function Flag({ locale }: Readonly<{ locale: Locale }>) {
  const flag = localeFlags[locale];
  return (
    <svg
      viewBox={flag.viewBox}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="h-3.5 w-[21px] shrink-0 rounded-[2px] ring-1 ring-white/15"
    >
      {flag.shapes.map((s) => (
        <path key={s.d} d={s.d} fill={s.fill} />
      ))}
    </svg>
  );
}
