import assert from "node:assert/strict";
import { test } from "node:test";
import { MeshStandardMaterial } from "three";
import { applyFade, eachFadeVariant, fading, type Fade } from "../three/fade.ts";

// three.js gölgelendiriciyi yalnız malzemenin sürümü (needsUpdate) değişince
// yeniden seçer; `transparent` tek başına değişirse eski (opak) gölgelendirici
// kalır ve nesne solmak yerine birden kaybolur.

test("an opaque material is marked for a shader update when it starts and stops fading", () => {
  const fade: Fade = { value: 1 };
  const material = fading(new MeshStandardMaterial(), fade);
  const start = material.version;

  applyFade(fade, 0.6);
  assert.equal(material.transparent, true);
  assert.equal(material.version, start + 1);

  // Solma sürerken her karede yeniden derleme istenmez.
  applyFade(fade, 0.3);
  applyFade(fade, 0.9);
  assert.equal(material.version, start + 1);

  applyFade(fade, 1);
  assert.equal(material.transparent, false);
  assert.equal(material.version, start + 2);
});

test("a material that is transparent on its own keeps its shader while fading", () => {
  const fade: Fade = { value: 1 };
  const material = fading(new MeshStandardMaterial({ transparent: true, opacity: 0.5 }), fade);
  const start = material.version;
  applyFade(fade, 0.5);
  applyFade(fade, 1);
  assert.equal(material.version, start);
  assert.equal(material.opacity, 0.5);
});

test("warm-up sees every fading material both opaque and transparent, then restores them", () => {
  const fade: Fade = { value: 1 };
  const opaque = fading(new MeshStandardMaterial(), fade);
  const glass = fading(new MeshStandardMaterial({ transparent: true }), fade);
  const plain = new MeshStandardMaterial();
  const seen: boolean[][] = [];
  const before = opaque.version;

  eachFadeVariant([opaque, glass, plain], () => seen.push([opaque.transparent, glass.transparent, plain.transparent]));

  assert.deepEqual(seen, [
    [true, true, false],
    [false, true, false],
  ]);
  assert.equal(opaque.transparent, false);
  assert.equal(glass.transparent, true);
  assert.ok(opaque.version > before, "the next frame re-selects the shader for the restored state");
});

test("warm-up also covers an opaque material that is faded out at the time", () => {
  const fade: Fade = { value: 1 };
  const hidden = fading(new MeshStandardMaterial(), fade);
  applyFade(fade, 0);
  const seen: boolean[] = [];
  eachFadeVariant([hidden], () => seen.push(hidden.transparent));
  assert.deepEqual(seen, [true, false]);
  assert.equal(hidden.transparent, true, "restored to its faded state");
});
