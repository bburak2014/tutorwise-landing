import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beatFromScroll,
  cameraAt,
  cameraKeys,
  chapterIndex,
  compositions,
  focusAt,
  inkProgress,
  pageTurn,
  restingBeat,
  riffle,
  isCut,
  jumpPresence,
  sceneOf,
  presence,
  sceneComposition,
  scenes,
  screenReveal,
  stageAt,
} from "../three/choreography.ts";

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

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

test("every scene has a composition, and each composition is used", () => {
  assert.equal(sceneComposition.length, scenes.length);
  for (const c of compositions) assert.ok(sceneComposition.includes(c), c);
  // 3D logo hiçbir sahnede yok: açılış ve kapanış dizüstü ile ders
  // nesneleri, Biz kimiz açılan kitap.
  assert.equal(sceneComposition[0], "hero");
  assert.equal(sceneComposition[1], "book");
  assert.equal(sceneComposition.at(-1), "hero");
  assert.ok(!(compositions as readonly string[]).includes("logo"));
});

test("stageAt holds a scene around its reading point and moves to the next between them", () => {
  assert.deepEqual(stageAt(2.5), { from: 2, to: 3, t: 0 });
  assert.deepEqual(stageAt(2.65), { from: 2, to: 3, t: 0 });
  assert.ok(near(stageAt(3).t, 0.5));
  assert.deepEqual(stageAt(3.4), { from: 2, to: 3, t: 1 });
  assert.deepEqual(stageAt(0), { from: 0, to: 1, t: 0 });
  assert.deepEqual(stageAt(scenes.length + 1), { from: scenes.length - 2, to: scenes.length - 1, t: 1 });
});

test("presence: the outgoing object dissolves first, the incoming one appears last", () => {
  // plan (calendar) → live (board)
  assert.equal(presence(2.5).calendar, 1);
  assert.equal(presence(2.5).board, 0);
  const middle = presence(3);
  assert.equal(middle.calendar, 0);
  assert.equal(middle.board, 0);
  assert.equal(presence(3.4).board, 1);
  // only one object at a reading point
  for (let s = 0; s < scenes.length; s++) {
    const p = presence(s + 0.5);
    assert.deepEqual(
      compositions.filter((c) => p[c] > 0),
      [sceneComposition[s]],
      `scene ${s}`,
    );
  }
});

test("the book appears only in the about scene", () => {
  assert.equal(presence(0.5).hero, 1);
  assert.equal(presence(0.5).book, 0);
  assert.equal(presence(1.5).book, 1);
  assert.equal(presence(1.5).hero, 0);
  for (let s = 0; s < scenes.length; s++) if (s !== 1) assert.equal(presence(s + 0.5).book, 0, `scene ${s}`);
});


test("focusAt is 1 at a scene's reading point and 0 halfway to the next", () => {
  assert.equal(focusAt(4.5, 4), 1);
  assert.equal(focusAt(5, 4), 0);
  assert.equal(focusAt(4.5, 5), 0);
});

test("cameraAt follows each scene's camera; the everywhere scene keeps the camera still", () => {
  assert.equal(cameraKeys.wide.length, scenes.length);
  assert.equal(cameraKeys.narrow.length, scenes.length);
  assert.deepEqual(cameraAt(8.5, "wide"), { dolly: 1, orbit: 0, tilt: 0 });
  assert.deepEqual(cameraAt(2.5, "wide"), cameraKeys.wide[2]);
  const halfway = cameraAt(3, "wide");
  assert.ok(near(halfway.orbit, (cameraKeys.wide[2].orbit + cameraKeys.wide[3].orbit) / 2));
});

test("isCut: a jump of more than one scene in one scroll step is a cut", () => {
  assert.equal(isCut(0.5, 7.3), true);
  assert.equal(isCut(8.3, 1.2), true);
  assert.equal(isCut(2.5, 3.5), false);
  assert.equal(isCut(3.1, 3.25), false);
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

test("inkProgress draws from 0 to 1 after the drawing starts", () => {
  assert.equal(inkProgress(1000, null, 1600), 0);
  assert.equal(inkProgress(1000, 1000, 1600), 0);
  assert.ok(inkProgress(1800, 1000, 1600) > 0.3 && inkProgress(1800, 1000, 1600) < 0.8);
  assert.equal(inkProgress(2700, 1000, 1600), 1);
});

test("screenReveal: the screen appears line by line in the second half of the rise", () => {
  assert.equal(screenReveal(0), 0);
  assert.equal(screenReveal(0.3), 0);
  assert.equal(screenReveal(1), 1);
  let last = 0;
  for (let r = 0; r <= 1; r += 0.05) {
    assert.ok(screenReveal(r) >= last);
    last = screenReveal(r);
  }
});

test("sceneOf rounds a beat to its scene and clamps", () => {
  assert.equal(sceneOf(2.5), 2);
  assert.equal(sceneOf(2.95), 2);
  assert.equal(sceneOf(3.1), 3);
  assert.equal(sceneOf(-1), 0);
  assert.equal(sceneOf(99), scenes.length - 1);
});

test("jumpPresence goes straight from the old object to the new one", () => {
  // Plan (takvim) → Kimler için (roller): aradaki tahta, ödev, paralar, grafik hiç görünmez.
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const p = jumpPresence(2.5, 7.4, k);
    const shown = compositions.filter((c) => p[c] > 0);
    assert.ok(shown.every((c) => c === "calendar" || c === "roles"), `k=${k}: ${shown}`);
  }
  assert.equal(jumpPresence(2.5, 7.4, 0).calendar, 1);
  assert.equal(jumpPresence(2.5, 7.4, 1).roles, 1);
  assert.equal(jumpPresence(2.5, 7.4, 1).calendar, 0);
});

test("pageTurn turns pages one after another", () => {
  assert.ok(near(pageTurn(2.5, 0), 1));
  assert.ok(near(pageTurn(2.5, 2), 0.5));
  assert.ok(near(pageTurn(2.5, 3), 0));
});

test("riffle: the top pages lift while the cover opens and settle back", () => {
  for (const k of [0, 1, 2]) {
    assert.equal(riffle(0, k), 0);
    assert.equal(riffle(1, k), 0);
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => riffle(i / 100, k)));
    assert.ok(peak > 0.1, `leaf ${k} lifts`);
  }
  // Üstteki sayfa en çok kalkar; alttakiler daha az.
  const peak = (k: number) => Math.max(...Array.from({ length: 101 }, (_, i) => riffle(i / 100, k)));
  assert.ok(peak(0) > peak(1) && peak(1) > peak(2));
});

test("restingBeat completes a transition the scroll stopped in, towards the scene the text shows", () => {
  // Okuma anının çevresinde (geçiş yok) sahne olduğu yerde kalır.
  for (const beat of [0.5, 2.5, 2.65, 3.32, 9.5]) assert.deepEqual(restingBeat(beat), { beat, zone: null }, `beat ${beat}`);
  // 2 → 3 geçişi 2.7–3.3 arasında; ortadan önce durulursa 2'ye, sonra 3'e tamamlanır.
  assert.deepEqual(restingBeat(2.9), { beat: 2.7, zone: [2.7, 3.3] });
  assert.deepEqual(restingBeat(3), { beat: 3.3, zone: [2.7, 3.3] });
  assert.deepEqual(restingBeat(3.2), { beat: 3.3, zone: [2.7, 3.3] });
  // Özellik metni ortadan bir piksel (≈0.0001 beat) önce değişir; sahne de.
  assert.equal(restingBeat(3.9999).beat, 4.3);
  assert.equal(restingBeat(3.9988).beat, 3.7);
});

test("at every resting beat one object is fully shown", () => {
  for (let b = 0.5; b <= scenes.length - 0.5; b += 0.01) {
    const shown = Math.max(...Object.values(presence(restingBeat(b).beat)));
    assert.ok(shown > 0.999, `beat ${b.toFixed(2)} rests with ${shown}`);
  }
});
