import { test } from "node:test";
import assert from "node:assert/strict";
import { bendAngles, gutterProfile } from "../three/bookShape.ts";

const near = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) <= eps;

test("gutterProfile dips into the spine, domes in the middle and settles at the fore-edge", () => {
  assert.ok(gutterProfile(0) < -0.03, "pages are pinched at the spine");
  const middle = gutterProfile(0.45);
  assert.ok(middle > 0.004, "pages dome up in the middle");
  assert.ok(near(gutterProfile(1), 0), "fore-edge sits at the block height");
  // Sırttan ortaya doğru hep yükselir.
  for (let u = 0.02; u <= 0.4; u += 0.02) assert.ok(gutterProfile(u) > gutterProfile(u - 0.02));
});

test("bendAngles makes a bone chain trace the profile", () => {
  const segments = 24;
  const width = 1.28;
  const step = width / segments;
  const angles = bendAngles((u) => gutterProfile(u) * 0.8, segments, width);
  assert.equal(angles.length, segments + 1);
  // Zinciri yürü: her kemik bir öncekine göre döner (three: y ekseninde
  // eksi açı ucu +z'ye kaldırır).
  let heading = 0;
  let x = 0;
  let z = gutterProfile(0) * 0.8;
  for (let i = 0; i < segments; i++) {
    heading += angles[i];
    x += Math.cos(-heading) * step;
    z += Math.sin(-heading) * step;
    assert.ok(near(z, gutterProfile(x / width) * 0.8, 0.002), `segment ${i}: z=${z} profile=${gutterProfile(x / width) * 0.8}`);
  }
});

test("bendAngles of a flat profile is all zeros", () => {
  assert.deepEqual(
    bendAngles(() => 0, 8, 1).map((a) => Math.abs(a)),
    new Array(9).fill(0),
  );
});
