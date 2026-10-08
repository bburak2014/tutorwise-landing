import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraFor, type Vec3 } from "../three/camera.ts";

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(...a);
const angle = (a: Vec3, b: Vec3) =>
  Math.acos(Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b))));
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

const base = { position: [0, 0, 8] as Vec3, target: [0, 0, 0] as Vec3 };
const book: Vec3 = [1.72, -0.58, 0];

test("cameraFor with no dolly or orbit keeps the base camera", () => {
  const cam = cameraFor(base, book, { dolly: 1, orbit: 0, tilt: 0 });
  assert.deepEqual(cam.position.map((v) => +v.toFixed(9)), base.position);
  assert.deepEqual(cam.target.map((v) => +v.toFixed(9)), base.target);
});

test("cameraFor keeps the book at the same place on screen while it moves in and around", () => {
  // Kitap ekranda aynı yönde kalır (metinle çakışmaz): bakış yönü ile
  // kitaba giden yön arasındaki açı değişmez.
  const before = angle(sub(base.target, base.position), sub(book, base.position));
  for (const cam of [
    { dolly: 0.85, orbit: 0, tilt: 0 },
    { dolly: 1, orbit: 0.2, tilt: 0 },
    { dolly: 0.9, orbit: -0.15, tilt: 0.08 },
  ]) {
    const c = cameraFor(base, book, cam);
    assert.ok(near(angle(sub(c.target, c.position), sub(book, c.position)), before, 1e-9));
  }
});

test("cameraFor dolly brings the camera closer to the book", () => {
  const far = len(sub(book, cameraFor(base, book, { dolly: 1, orbit: 0, tilt: 0 }).position));
  const close = len(sub(book, cameraFor(base, book, { dolly: 0.8, orbit: 0, tilt: 0 }).position));
  assert.ok(near(close, far * 0.8, 1e-9));
});
