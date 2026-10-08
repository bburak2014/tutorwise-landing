// `pnpm build` çıktısını (out/) denetler. Önce derleme gerekir.
// OUT_DIR ile başka bir klasör verilebilir (boş klasörde testler kırmızı olmalı).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { content } from "../content/index.ts";
import { locales } from "../i18n/locales.ts";
import { site } from "../lib/site.ts";

const out = path.resolve(process.env.OUT_DIR ?? "out");
const read = (file: string) => readFileSync(path.join(out, file), "utf8");

/** Yerel bir varlık adresini out/ içindeki dosyaya çevirir. */
function fileFor(url: string) {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  return path.join(out, clean.endsWith("/") ? `${clean}index.html` : clean);
}

function localRefs(html: string) {
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"/][^"]*)"/g)].map((m) => m[1]);
  return [...new Set(refs)];
}

/** Derlenmiş kök sayfadaki betiği sahte tarayıcıda çalıştırır. */
function runRootScript(cookie: string, languages: string[]) {
  const html = read("index.html");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .find((s) => s.includes("location.replace"));
  assert.ok(script, "kök sayfada yönlendirme betiği yok");
  let target = "";
  // eslint-disable-next-line sonarjs/code-eval -- derlenmiş kendi betiğimizi yalıtılmış vm bağlamında çalıştırıyoruz; dışarıdan girdi yok
  vm.runInNewContext(script, {
    document: { cookie },
    navigator: { languages, language: languages[0] ?? "" },
    location: { replace: (url: string) => (target = url) },
  });
  return target;
}

test("the root page redirects by cookie, then browser language, then English", () => {
  assert.equal(runRootScript("derslik-locale=ja", ["de-DE"]), "/ja/");
  assert.equal(runRootScript("", ["pt-BR", "de-DE"]), "/de/");
  assert.equal(runRootScript("", ["pt-BR"]), "/en/");
});

test("the root page lists every language for browsers without JavaScript", () => {
  const html = read("index.html");
  for (const locale of locales) assert.match(html, new RegExp(`href="/${locale}/"`));
});

for (const locale of locales) {
  test(`${locale} page declares its language and title`, () => {
    const html = read(`${locale}/index.html`);
    assert.match(html, new RegExp(`<html[^>]*\\blang="${locale}"`));
    const title = content[locale].meta.title.replaceAll("'", "&#x27;");
    assert.ok(html.includes(`<title>${title}</title>`), `title missing in ${locale}`);
  });

  test(`${locale} page links every language with hreflang`, () => {
    const html = read(`${locale}/index.html`);
    for (const other of locales) {
      assert.ok(
        html.includes(`hrefLang="${other}" href="${site.url}/${other}/"`),
        `${locale} → ${other} hreflang missing`,
      );
    }
    assert.ok(html.includes(`hrefLang="x-default" href="${site.url}/"`));
    assert.ok(html.includes(`rel="canonical" href="${site.url}/${locale}/"`));
  });

  test(`${locale} page only references files that exist in out/`, () => {
    const missing = localRefs(read(`${locale}/index.html`)).filter(
      (ref) => !existsSync(fileFor(ref)),
    );
    assert.deepEqual(missing, []);
  });
}
