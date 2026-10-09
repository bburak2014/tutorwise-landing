import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assetVersion } from "../lib/asset-version.ts";

test("the asset version changes when an image changes, and only then", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "assets-"));
  try {
    mkdirSync(path.join(dir, "en"));
    writeFileSync(path.join(dir, "en", "a.webp"), "one");
    writeFileSync(path.join(dir, "b.webp"), "two");
    const first = assetVersion([dir]);
    assert.match(first, /^[0-9a-f]{10}$/);
    assert.equal(assetVersion([dir]), first);
    writeFileSync(path.join(dir, "en", "a.webp"), "changed");
    assert.notEqual(assetVersion([dir]), first);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
