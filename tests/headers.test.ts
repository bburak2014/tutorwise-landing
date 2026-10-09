import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/** public/_headers'taki "/*" kuralının Content-Security-Policy yönergeleri. */
function csp(): Map<string, string[]> {
  const lines = readFileSync("public/_headers", "utf8").split("\n");
  let inRoot = false;
  for (const line of lines) {
    if (!/^\s/.test(line) && line.trim()) inRoot = line.trim() === "/*";
    const prefix = "Content-Security-Policy:";
    const value = inRoot && line.trim().startsWith(prefix) ? line.trim().slice(prefix.length) : null;
    if (value)
      return new Map(
        value.split(";").map((part) => {
          const [name, ...values] = part.trim().split(/\s+/);
          return [name, values];
        }),
      );
  }
  throw new Error("CSP bulunamadı");
}

test("CSP lets Cloudflare Web Analytics load its beacon", () => {
  assert.ok(csp().get("script-src")?.includes("https://static.cloudflareinsights.com"));
});

test("CSP lets the beacon report to Cloudflare", () => {
  assert.ok(csp().get("connect-src")?.includes("https://cloudflareinsights.com"));
});

test("CSP still forbids eval and other origins for scripts", () => {
  const scripts = csp().get("script-src") ?? [];
  assert.ok(!scripts.includes("'unsafe-eval'"));
  assert.ok(!scripts.includes("*") && !scripts.includes("https:"));
});

/** _headers'ta bir yol kuralının Cache-Control değeri. */
function cacheControl(rule: string) {
  const lines = readFileSync("public/_headers", "utf8").split("\n");
  const at = lines.findIndex((line) => line.trim() === rule);
  const value = lines.slice(at + 1).find((line) => line.trim().startsWith("Cache-Control:"));
  return at < 0 ? null : (value?.trim().slice("Cache-Control:".length).trim() ?? null);
}

test("screenshots and posters are cached for a year (their URLs carry a content version)", () => {
  for (const rule of ["/screens/*", "/poster/*"])
    assert.equal(cacheControl(rule), "public, max-age=31536000, immutable", rule);
});
