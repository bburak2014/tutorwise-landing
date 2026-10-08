type IconProps = Readonly<{ className?: string }>;

export function ArrowRight({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="none">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppleMark({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.66-.39 6.59 1.1 8.75.73 1.05 1.6 2.23 2.73 2.19 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22Z" />
    </svg>
  );
}

export function PlayMark({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4.2 2.6 13.6 12l-9.4 9.4c-.4-.2-.7-.7-.7-1.3V3.9c0-.6.3-1.1.7-1.3Z" fill="#4fc3f7" />
      <path d="m16.7 8.9-3.1 3.1-9.4-9.4c.3-.2.8-.2 1.2 0l11.3 6.3Z" fill="#69f0ae" />
      <path d="m16.7 15.1-11.3 6.3c-.4.2-.9.2-1.2 0l9.4-9.4 3.1 3.1Z" fill="#ff5252" />
      <path d="m20.3 10.9-3.6-2-3.1 3.1 3.1 3.1 3.6-2c1-.5 1-1.7 0-2.2Z" fill="#ffd740" />
    </svg>
  );
}

export function Check({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="none">
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Globe({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="none">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M1.9 8h12.2M8 1.75c1.7 1.8 2.5 3.9 2.5 6.25S9.7 12.45 8 14.25C6.3 12.45 5.5 10.35 5.5 8S6.3 3.55 8 1.75Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
