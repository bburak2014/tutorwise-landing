import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beatFromScroll,
  chapterIndex,
  isCut,
  deviceAt,
  introPose,
  keys,
  pageTurn,
  poseAt,
  scenes,
  spineGlow,
} from "../three/choreography.ts";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

test("beatFromScroll measures progress from a section's top to the next one's", () => {
  const tops = [0, 900, 1800];
  assert.ok(near(beatFromScroll(450, tops, 2700), 0.5));
  assert.ok(near(beatFromScroll(900, tops, 2700), 1));
  assert.ok(near(beatFromScroll(1350, tops, 2700), 1.5));
  assert.ok(near(beatFromScroll(2250, tops, 2700), 2.5));
});

test("beatFromScroll clamps before the first and after the last section", () => {
  const tops = [0, 900, 1800];
  assert.ok(near(beatFromScroll(-10, tops, 2700), 0));
  assert.ok(near(beatFromScroll(3000, tops, 2700), 3));
});

test("beatFromScroll treats a gap between sections as part of the earlier one", () => {
  // 0–900 hero, 900–1200 a block without a scene, 1200 the next scene
  assert.ok(near(beatFromScroll(1050, [0, 1200], 2100), 1050 / 1200));
});

test("pageTurn turns pages one after another", () => {
  assert.ok(near(pageTurn(2.5, 0), 1));
  assert.ok(near(pageTurn(2.5, 2), 0.5));
  assert.ok(near(pageTurn(2.5, 3), 0));
});

test("there is one keyframe per scene in both layouts", () => {
  assert.equal(keys.wide.length, scenes.length);
  assert.equal(keys.narrow.length, scenes.length);
});

test("poseAt holds each scene's keyframe around its reading point", () => {
  assert.deepEqual(poseAt(0.5, "wide"), keys.wide[0]);
  assert.deepEqual(poseAt(0.65, "wide"), keys.wide[0]);
  assert.deepEqual(poseAt(2.5, "wide"), keys.wide[2]);
  assert.deepEqual(poseAt(4.4, "narrow"), keys.narrow[4]);
});

test("poseAt clamps before the first and after the last reading point", () => {
  assert.deepEqual(poseAt(0, "wide"), keys.wide[0]);
  assert.deepEqual(poseAt(scenes.length, "wide"), keys.wide.at(-1));
});

test("poseAt is halfway between two scenes at their boundary", () => {
  const a = keys.wide[0];
  const b = keys.wide[1];
  const mid = poseAt(1, "wide");
  assert.ok(near(mid.cover, (a.cover + b.cover) / 2));
  assert.ok(near(mid.x, (a.x + b.x) / 2));
});

test("the cover opens for the story, pages turn per chapter and close at the end", () => {
  const at = (scene: (typeof scenes)[number]) => poseAt(scenes.indexOf(scene) + 0.5, "wide");
  assert.equal(at("hero").cover, 0);
  assert.equal(at("about").cover, 1);
  assert.equal(at("chapter-plan").flip, 1);
  assert.equal(at("chapter-family").flip, 5);
  assert.equal(at("final").cover, 0);
  assert.equal(at("final").flip, 0);
});

test("deviceAt shows the chapter's screen fully risen at its reading point", () => {
  assert.deepEqual(deviceAt(2.5), { screen: "calendar", kind: "tablet", rise: 1 });
  assert.deepEqual(deviceAt(4.5), { screen: "homework", kind: "phone", rise: 1 });
});

test("deviceAt hides the device between chapters and outside them", () => {
  assert.ok(near(deviceAt(3).rise, 0));
  assert.ok(near(deviceAt(1.5).rise, 0));
  assert.equal(deviceAt(1.5).screen, null);
});

test("introPose starts far back with the spine light off and lands on the pose", () => {
  const target = keys.wide[0];
  const start = introPose(target, 0);
  assert.ok(start.z < target.z - 3);
  assert.equal(start.glow, 0);
  assert.deepEqual(introPose(target, 1), target);
});

test("introPose moves steadily towards the pose", () => {
  const target = keys.wide[0];
  const zs = [0, 0.25, 0.5, 0.75, 1].map((t) => introPose(target, t).z);
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i] >= zs[i - 1]);
});

test("spineGlow is off, flickers on, then stays on", () => {
  assert.equal(spineGlow(0), 0);
  assert.equal(spineGlow(1), 1);
  const samples = Array.from({ length: 101 }, (_, i) => spineGlow(i / 100));
  assert.ok(samples.every((v) => v >= 0 && v <= 1));
  assert.ok(samples.some((v, i) => i > 0 && v < samples[i - 1]), "no flicker");
});

test("chapterIndex switches halfway between two chapters", () => {
  assert.equal(chapterIndex(0, 5), 0);
  assert.equal(chapterIndex(0.124, 5), 0);
  assert.equal(chapterIndex(0.126, 5), 1);
  assert.equal(chapterIndex(1, 5), 4);
});

test("chapterIndex clamps outside the pinned range", () => {
  assert.equal(chapterIndex(-0.2, 5), 0);
  assert.equal(chapterIndex(1.3, 5), 4);
});

test("isCut: a jump of more than one scene in one scroll step is a cut", () => {
  // Bağlantı ya da End tuşu: sayfa bir adımda birkaç sahne atlar.
  assert.equal(isCut(0.5, 7.3), true);
  assert.equal(isCut(8.3, 1.2), true);
  // Bölüm çizgisinde komşu özelliğe geçiş: sayfa dönüşü görünsün.
  assert.equal(isCut(2.5, 3.5), false);
  // Sıradan tekerlek ve dokunmatik kaydırma.
  assert.equal(isCut(3.1, 3.25), false);
});
