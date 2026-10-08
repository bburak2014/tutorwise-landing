import { test } from "node:test";
import assert from "node:assert/strict";
import { content } from "../content/index.ts";
import { locales } from "../i18n/locales.ts";

type Tree = string | readonly string[] | { [key: string]: Tree };

/** Bir metin ağacının biçimi: anahtarlar ve dizi uzunlukları, metinler olmadan. */
function shape(node: Tree): unknown {
  if (typeof node === "string") return "text";
  if (Array.isArray(node)) return `list:${node.length}`;
  return Object.fromEntries(
    Object.entries(node as Record<string, Tree>).map(([k, v]) => [k, shape(v)]),
  );
}

function leaves(node: Tree, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node))
    return node.flatMap((v: string, i: number) => leaves(v, `${path}[${i}]`));
  return Object.entries(node as Record<string, Tree>).flatMap(([k, v]) =>
    leaves(v, path ? `${path}.${k}` : k),
  );
}

test("every locale has a content catalog", () => {
  assert.deepEqual(Object.keys(content).sort(), [...locales].sort());
});

for (const locale of locales) {
  test(`${locale} matches the Turkish catalog's shape, list lengths included`, () => {
    assert.deepEqual(shape(content[locale]), shape(content.tr));
  });

  test(`${locale} has no empty strings`, () => {
    const empty = leaves(content[locale]).filter(([, v]) => !v.trim());
    assert.deepEqual(empty, []);
  });

  test(`${locale} names the brand Tutorwise, never Derslik`, () => {
    const text = leaves(content[locale]).map(([, v]) => v).join("\n");
    assert.match(text, /Tutorwise/);
    assert.doesNotMatch(text, /Derslik/i);
  });
}

test("non-Turkish catalogs are not Turkish copies", () => {
  const trText = new Set(leaves(content.tr).map(([, v]) => v));
  for (const locale of locales.filter((l) => l !== "tr")) {
    const copied = leaves(content[locale]).filter(
      ([, v]) => trText.has(v) && !/^(Tutorwise|App Store|Google Play|PDF|iOS|Android|Web|Menü|Meet, Zoom, Teams, Jitsi)$/.test(v),
    );
    assert.deepEqual(copied, [], `${locale} has untranslated Turkish text`);
  }
});

test("no language still shows a placeholder note on the page", () => {
  for (const locale of locales) {
    const notes = leaves(content[locale] as unknown as Tree)
      .filter(([, text]) => /^\s*\[[^\]]+\]\s*$/.test(text))
      .map(([path]) => path);
    assert.deepEqual(notes, [], `${locale} has placeholders`);
  }
});
