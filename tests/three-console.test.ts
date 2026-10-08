import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldForward } from "../three/console.ts";

const CLOCK = "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";

test("the THREE.Clock deprecation from React Three Fiber 9 is dropped", () => {
  assert.equal(shouldForward("warn", CLOCK), false);
});

test("every other three.js warning still reaches the console", () => {
  assert.equal(shouldForward("warn", "THREE.WebGLRenderer: Context Lost."), true);
  assert.equal(shouldForward("warn", "THREE.Material: parameter 'x' has value of undefined."), true);
});

test("errors and logs are never dropped, even with the same text", () => {
  assert.equal(shouldForward("error", CLOCK), true);
  assert.equal(shouldForward("log", CLOCK), true);
});
