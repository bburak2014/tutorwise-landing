import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MARK_CENTER, brand, iconSvg, markParts, markSvg } from "../lib/brand.ts";

const numbers = (d: string) => [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));

test("the right half of the mark mirrors the left half", () => {
  for (const name of ["cover", "upper", "lower"] as const) {
    const left = numbers(markParts[name].left);
    const right = numbers(markParts[name].right);
    assert.equal(left.length, right.length);
    left.forEach((value, i) => {
      const expected = i % 2 === 0 ? 2 * MARK_CENTER - value : value;
      assert.ok(Math.abs(right[i] - expected) < 0.06, `${name}[${i}]: ${right[i]} ≠ ${expected}`);
    });
  }
});

test("the light variant swaps navy for a light ink and keeps the page colors", () => {
  const dark = markSvg({ tone: "on-light" });
  const light = markSvg({ tone: "on-dark" });
  assert.ok(dark.includes(brand.navy));
  assert.ok(!light.includes(brand.navy));
  for (const color of [brand.orange, brand.sky]) assert.ok(light.includes(color) && dark.includes(color));
});

test("the favicon and app icon in public/ are generated from lib/brand.ts", () => {
  assert.equal(readFileSync("public/favicon.svg", "utf8"), iconSvg(64));
  assert.equal(readFileSync("public/icon.svg", "utf8"), iconSvg(1024));
});
