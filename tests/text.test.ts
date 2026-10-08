import { test } from "node:test";
import assert from "node:assert/strict";
import { capitalize, splitLabel } from "../lib/text.ts";

test("capitalize follows the language's casing rules", () => {
  assert.equal(capitalize("işi iyi yapar", "tr"), "İşi iyi yapar");
  assert.equal(capitalize("every screen", "en"), "Every screen");
  assert.equal(capitalize("", "en"), "");
});

test("splitLabel separates a 'Name: text' value and capitalizes the text", () => {
  assert.deepEqual(splitLabel("Sadelik: her ekran tek bir işi iyi yapar.", "tr"), [
    "Sadelik",
    "Her ekran tek bir işi iyi yapar.",
  ]);
});

test("splitLabel handles French spacing and the full-width colon", () => {
  assert.deepEqual(splitLabel("Simplicité : chaque écran", "fr"), ["Simplicité", "Chaque écran"]);
  assert.deepEqual(splitLabel("シンプル：どの画面も", "ja"), ["シンプル", "どの画面も"]);
});
