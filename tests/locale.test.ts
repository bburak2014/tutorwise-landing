import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { matchLocale, negotiateLocale } from "../i18n/locales.ts";
import { chooseLocale, localeCookie, redirectScript } from "../i18n/choose.ts";

const supported = ["tr", "en", "de", "fr", "es", "zh", "ja"];
const choose = (cookie: string, languages: string[]) =>
  chooseLocale(cookie, languages, supported, "en", "derslik-locale");

test("matchLocale reduces tags to a supported base language", () => {
  assert.equal(matchLocale("zh-Hans-CN"), "zh");
  assert.equal(matchLocale("en_US"), "en");
  assert.equal(matchLocale("DE"), "de");
  assert.equal(matchLocale("pt-BR"), null);
  assert.equal(matchLocale(""), null);
});

test("negotiateLocale ranks Accept-Language and falls back to English", () => {
  assert.equal(negotiateLocale("de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(negotiateLocale("pt-BR,pt;q=0.9"), "en");
  assert.equal(negotiateLocale("fr;q=0, ja"), "ja");
  assert.equal(negotiateLocale(null), "en");
});

test("chooseLocale prefers the app's locale cookie over browser languages", () => {
  assert.equal(choose("theme=dark; derslik-locale=ja", ["de-DE"]), "ja");
});

test("chooseLocale ignores an unsupported cookie value", () => {
  assert.equal(choose("derslik-locale=xx", ["fr-FR"]), "fr");
});

test("chooseLocale takes the first supported browser language", () => {
  assert.equal(choose("", ["pt-BR", "es-ES", "de"]), "es");
});

test("chooseLocale falls back to English", () => {
  assert.equal(choose("", ["pt-BR"]), "en");
  assert.equal(choose("", []), "en");
});

test("chooseLocale does not match a cookie whose name only ends the same", () => {
  assert.equal(choose("old-derslik-locale=ja", ["de"]), "de");
});

/** `<head>` betiğini sahte bir tarayıcı ortamında çalıştırır, gidilen adresi döndürür. */
function runRedirect(cookie: string, navigator: object): string {
  let target = "";
  // eslint-disable-next-line sonarjs/code-eval -- sayfaya gömülen kendi sabit betiğimizi yalıtılmış bir vm bağlamında test ediyoruz; dışarıdan girdi yok
  vm.runInNewContext(redirectScript, {
    document: { cookie },
    navigator,
    location: { replace: (url: string) => (target = url) },
  });
  return target;
}

test("redirectScript sends the browser to the chosen locale page", () => {
  assert.equal(runRedirect("derslik-locale=tr", { languages: ["de"], language: "de" }), "/tr/");
});

test("redirectScript works when navigator.languages is missing", () => {
  assert.equal(runRedirect("", { language: "zh-CN" }), "/zh/");
});

test("localeCookie writes the app's cookie format", () => {
  assert.equal(
    localeCookie("de", ""),
    "derslik-locale=de; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
  );
});

test("localeCookie adds a domain when one is configured", () => {
  assert.equal(
    localeCookie("ja", ".tutorwise.academy"),
    "derslik-locale=ja; Path=/; Max-Age=31536000; SameSite=Lax; Secure; Domain=.tutorwise.academy",
  );
});
