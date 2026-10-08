import { getContent, currentLocale } from "@/lib/locale.ts";
import { links } from "@/lib/site.ts";
import { HeaderFrame } from "./HeaderFrame.tsx";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";
import { MobileMenu } from "./MobileMenu.tsx";
import { Logo } from "./Logo.tsx";

export async function Header() {
  const locale = await currentLocale();
  const { nav } = await getContent();
  const sections = [
    { href: "#features", label: nav.features },
    { href: "#audiences", label: nav.audiences },
    { href: "#about", label: nav.about },
    { href: "#download", label: nav.download },
  ];
  return (
    <HeaderFrame>
      <a
        href="#main"
        className="btn btn-primary absolute left-4 top-3 z-50 -translate-y-24 focus:translate-y-0"
      >
        {nav.skip}
      </a>
      <div className="shell flex h-[var(--header-h)] items-center gap-6">
        <a href={`/${locale}/`} aria-label={nav.home} className="shrink-0">
          <Logo />
        </a>
        <nav aria-label={nav.sections} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-8 text-[0.9375rem]">
            {sections.map((section) => (
              <li key={section.href}>
                <a
                  href={section.href}
                  className="text-muted transition-colors hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:ml-6">
          <LanguageSwitcher locale={locale} label={nav.language} />
          <a href={links.signIn} className="btn btn-ghost hidden h-10 min-h-0 px-4 text-sm sm:inline-flex">
            {nav.signIn}
          </a>
          <MobileMenu
            sections={sections}
            signIn={{ href: links.signIn, label: nav.signIn }}
            label={nav.menu}
          />
        </div>
      </div>
    </HeaderFrame>
  );
}
