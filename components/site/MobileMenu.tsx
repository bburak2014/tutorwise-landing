"use client";
import { useEffect, useId, useRef, useState } from "react";

type Link = { href: string; label: string };

/** Dar ekranda bölüm bağlantıları ve giriş düğmesi. Panel üst menünün
 *  altında açılır; bağlantıya dokununca ya da Escape ile kapanır. */
export function MobileMenu({
  sections,
  signIn,
  label,
}: Readonly<{ sections: Link[]; signIn: Link; label: string }>) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-line-strong"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5" fill="none">
          <path
            d={open ? "M5 5l10 10M15 5L5 15" : "M3.5 6.5h13M3.5 13.5h13"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="glass fixed inset-x-3 top-[calc(var(--header-h)+0.25rem)] z-50 rounded-3xl bg-night/95 p-3 shadow-2xl shadow-black/50"
      >
        <ul className="flex flex-col">
          {sections.map((section) => (
            <li key={section.href}>
              <a
                href={section.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3.5 text-lg text-ink transition-colors hover:bg-white/6"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
        <a href={signIn.href} onClick={() => setOpen(false)} className="btn btn-ghost mt-2 w-full">
          {signIn.label}
        </a>
      </div>
    </div>
  );
}
