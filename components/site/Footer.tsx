import { currentLocale, getContent } from "@/lib/locale.ts";
import { site, type SitePage } from "@/lib/site.ts";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";
import { Logo } from "./Logo.tsx";

export async function Footer({ page = "" }: Readonly<{ page?: SitePage }>) {
  const locale = await currentLocale();
  const { footer, nav } = await getContent();
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 border-t border-line bg-deep/80 backdrop-blur-xl">
      <div className="shell grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-4 max-w-xs text-muted">{footer.tagline}</p>
        </div>
        <div className="flex flex-col gap-2 md:col-span-4">
          <p className="text-sm font-medium text-ink">{footer.contact}</p>
          <a href={`mailto:${site.email}`} className="w-fit text-muted transition-colors hover:text-ink">
            {site.email}
          </a>
        </div>
        <div className="flex md:col-span-3 md:justify-end">
          <LanguageSwitcher locale={locale} label={nav.language} page={page} placement="above" />
        </div>
      </div>
      <div className="shell">
        <div className="flex flex-col gap-4 border-t border-line py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {site.name} · {site.domain}. {footer.rights}
        </p>
        <ul className="flex gap-6">
          <li>
            <a href={`/${locale}/privacy/`} className="transition-colors hover:text-ink">
              {footer.privacy}
            </a>
          </li>
          <li>
            <a href={`/${locale}/terms/`} className="transition-colors hover:text-ink">
              {footer.terms}
            </a>
          </li>
        </ul>
        </div>
      </div>
    </footer>
  );
}
