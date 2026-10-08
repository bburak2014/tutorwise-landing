import { test } from "node:test";
import assert from "node:assert/strict";
import { legal } from "../content/legal/index.ts";
import { locales } from "../i18n/locales.ts";
import { site } from "../lib/site.ts";

type Tree = string | readonly Tree[] | { [key: string]: Tree };

/** Metin ağacının biçimi (anahtarlar, dizi uzunlukları), metinler olmadan. */
function shape(node: Tree): unknown {
  if (typeof node === "string") return "text";
  if (Array.isArray(node)) return node.map(shape);
  return Object.fromEntries(Object.entries(node as Record<string, Tree>).map(([k, v]) => [k, shape(v)]));
}

function leaves(node: Tree): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(leaves);
  return Object.values(node as Record<string, Tree>).flatMap(leaves);
}

test("every locale has the privacy policy and the terms", () => {
  assert.deepEqual(Object.keys(legal).sort(), [...locales].sort());
});

for (const locale of locales) {
  test(`${locale} legal texts follow the Turkish source section by section`, () => {
    assert.deepEqual(shape(legal[locale]), shape(legal.tr));
  });

  test(`${locale} legal texts have no empty or placeholder text and name the brand`, () => {
    const text = leaves(legal[locale]);
    assert.deepEqual(text.filter((v) => !v.trim()), []);
    assert.deepEqual(text.filter((v) => /\[|YER TUTUCU|TODO|lorem/i.test(v)), []);
    const all = text.join("\n");
    assert.match(all, /Tutorwise/);
    assert.doesNotMatch(all, /Derslik/i);
  });

  test(`${locale} privacy policy names the contact address and the services that process data`, () => {
    const all = leaves(legal[locale].privacy).join("\n");
    assert.ok(all.includes(site.email));
    for (const name of ["Supabase", "Cloudflare", "Resend", "Lemon Squeezy"]) assert.ok(all.includes(name), name);
  });
}

test("translated legal texts are not Turkish copies", () => {
  const tr = new Set(leaves(legal.tr).filter((v) => v.length > 40));
  for (const locale of locales.filter((l) => l !== "tr")) {
    const copied = leaves(legal[locale]).filter((v) => tr.has(v));
    assert.deepEqual(copied, [], locale);
  }
});
