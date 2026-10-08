"use client";
import { useEffect, useId, useRef, useState } from "react";
import { localeCookie } from "@/i18n/choose.ts";
import { localeNames, locales, type Locale } from "@/i18n/locales.ts";
import { site } from "@/lib/site.ts";
import { Flag } from "./Flag.tsx";

/** Dil seçici. Her dil gerçek bir bağlantıdır (JavaScript olmadan da
 *  çalışır); tıklanınca seçim uygulamanın dil çerezine de yazılır. */
export function LanguageSwitcher({
  locale,
  label,
  placement = "below",
}: Readonly<{ locale: Locale; label: string; placement?: "below" | "above" }>) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const position =
    placement === "above" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${localeNames[locale]} (${locale.toUpperCase()})`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium text-ink transition-colors hover:border-line-strong"
      >
        <Flag locale={locale} />
        <span className="uppercase tracking-wide">{locale}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 text-muted">
          <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      <ul
        id={listId}
        hidden={!open}
        className={`glass absolute right-0 z-50 min-w-48 rounded-2xl p-1.5 shadow-2xl shadow-black/40 ${position}`}
      >
        {locales.map((item) => (
          <li key={item}>
            <a
              href={`/${item}/`}
              hrefLang={item}
              lang={item}
              aria-current={item === locale ? "page" : undefined}
              onClick={() => {
                document.cookie = localeCookie(item, site.cookieDomain);
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text transition-colors hover:bg-white/6 hover:text-ink aria-[current=page]:text-ink"
            >
              <Flag locale={item} />
              <span className="flex-1">{localeNames[item]}</span>
              {item === locale && (
                <span className="size-1.5 rounded-full bg-marker" aria-hidden="true" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
