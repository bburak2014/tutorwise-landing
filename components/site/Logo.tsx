import { useId } from "react";
import { MARK_VIEWBOX, ROYAL_GRADIENT, capParts, markColors, markParts, type Tone } from "@/lib/brand.ts";

/** Tutorwise Academy işareti (açık kitap ve kep), lib/brand.ts'ten. Site
 *  koyu zeminli olduğu için varsayılan on-dark: lacivert kısımlar açık. */
export function LogoMark({ className = "h-9 w-auto", tone = "on-dark" }: Readonly<{ className?: string; tone?: Tone }>) {
  const id = useId();
  const c = markColors(tone);
  const { x, y, width, height } = MARK_VIEWBOX;
  return (
    <svg viewBox={`${x} ${y} ${width} ${height}`} aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`${id}-royal`} gradientUnits="userSpaceOnUse" {...ROYAL_GRADIENT}>
          <stop offset="0" stopColor={c.royal[0]} />
          <stop offset="1" stopColor={c.royal[1]} />
        </linearGradient>
      </defs>
      <path fill={c.ink} d={markParts.cover.left} />
      <path fill={c.ink} d={markParts.cover.right} />
      <path fill={c.orange} d={markParts.upper.left} />
      <path fill={c.sky} d={markParts.upper.right} />
      <path fill={c.sky} d={markParts.lower.left} />
      <path fill={`url(#${id}-royal)`} d={markParts.lower.right} />
      <path fill={c.ink} stroke={c.ink} strokeWidth="6" strokeLinejoin="round" d={capParts.top} />
      <path fill={c.ink} d={capParts.base} />
      <path fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round" d={capParts.cord} />
      <circle fill={c.ink} {...capParts.knob} />
      <path fill={c.ink} d={capParts.tassel} />
    </svg>
  );
}

/** İşaret ve iki satırlık yazı: "Tutorwise" kalın, altında "Academy"
 *  (logodaki gibi Montserrat). */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col font-brand leading-none">
        <span className="text-[1.18rem] font-extrabold tracking-[-0.01em] text-ink">Tutorwise</span>
        <span className="mt-[3px] text-[0.8rem] font-medium tracking-[0.01em] text-muted">Academy</span>
      </span>
    </span>
  );
}
