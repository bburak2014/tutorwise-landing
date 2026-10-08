import { links } from "@/lib/site.ts";
import { AppleMark, PlayMark } from "./Icons.tsx";

/** Mağaza düğmeleri. Gerçek bağlantılar gelince resmî rozetlerle
 *  değiştirilecek; şimdilik bağlantılar "#". */
export function StoreBadges({
  appStoreKicker,
  googlePlayKicker,
}: Readonly<{ appStoreKicker: string; googlePlayKicker: string }>) {
  const badge =
    "inline-flex h-12 items-center gap-2.5 rounded-xl border border-line-strong bg-black/40 px-4 text-left text-ink backdrop-blur transition-colors hover:border-white/35";
  return (
    <div className="flex flex-wrap gap-3">
      <a href={links.appStore} className={badge}>
        <AppleMark className="size-6" />
        <span className="flex flex-col leading-none">
          <span className="text-[0.6875rem] text-muted">{appStoreKicker}</span>
          <span className="mt-1 text-[1.0625rem] font-semibold tracking-tight">App Store</span>
        </span>
      </a>
      <a href={links.googlePlay} className={badge}>
        <PlayMark className="size-5" />
        <span className="flex flex-col leading-none">
          <span className="text-[0.6875rem] text-muted">{googlePlayKicker}</span>
          <span className="mt-1 text-[1.0625rem] font-semibold tracking-tight">Google Play</span>
        </span>
      </a>
    </div>
  );
}
