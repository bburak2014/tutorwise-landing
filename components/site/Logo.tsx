import { site } from "@/lib/site.ts";

/** Açık kitap işareti (uygulamanın simgesi) ve Tutorwise yazısı. */
export function LogoMark({ className = "size-8" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="16" fill="#141c4d" />
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        rx="15.5"
        fill="none"
        stroke="rgb(255 255 255 / 0.12)"
      />
      <path
        d="M15 18c7-2 12 0 17 4 5-4 10-6 17-4v29c-6-2-12 0-17 4-5-4-11-6-17-4Z"
        fill="none"
        stroke="#ffd84a"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M32 22v29" stroke="#ffd84a" strokeWidth="3.5" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[1.3rem] font-semibold tracking-[-0.02em] text-ink">
        {site.name}
      </span>
    </span>
  );
}
