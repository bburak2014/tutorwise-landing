import { Logo } from "@/components/site/Logo.tsx";
import { redirectScript } from "@/i18n/choose.ts";
import { localeNames, locales } from "@/i18n/locales.ts";

/** "/" — dili uygulamadaki sırayla seçip o dilin sayfasına geçer (çerez,
 *  tarayıcı dili, İngilizce). Betik gövdenin başında, içerik çizilmeden
 *  çalışır; JavaScript kapalıysa dil listesi görünür. */
export default function ChooseLanguage() {
  return (
    <main className="relative grid min-h-svh place-items-center px-4">
      <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      <div className="stage" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <Logo />
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {locales.map((locale) => (
            <li key={locale}>
              <a
                href={`/${locale}/`}
                hrefLang={locale}
                lang={locale}
                className="text-muted transition-colors hover:text-ink"
              >
                {localeNames[locale]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
