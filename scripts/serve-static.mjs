// out/ klasörünü sıradan bir statik sunucu gibi servis eder (next dev değil):
// "/tr/" → out/tr/index.html, bulunamayan → 404.html. Yalnız 127.0.0.1.
// out/_headers dosyasındaki başlıkları (CSP dahil) barındırıcı gibi uygular.
// Kullanım: node scripts/serve-static.mjs [port] [klasör]
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const port = Number(process.argv[2] ?? 4321);
const root = path.resolve(process.argv[3] ?? "out");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
  ".hdr": "application/octet-stream",
  ".ktx2": "image/ktx2",
};

/** Cloudflare Pages / Netlify biçimi: girintisiz satır yol kalıbı, girintili
 *  satırlar "Ad: değer". Kalıp "*" ile bitiyorsa önek eşleşmesi. */
function parseHeaders(file) {
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: {} });
    else if (rules.length) {
      const at = line.indexOf(":");
      rules.at(-1).headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
  }
  return rules;
}
const headerRules = parseHeaders(path.join(root, "_headers"));
function headersFor(urlPath) {
  const out = {};
  for (const { pattern, headers } of headerRules) {
    const match = pattern.endsWith("*") ? urlPath.startsWith(pattern.slice(0, -1)) : urlPath === pattern;
    if (match) Object.assign(out, headers);
  }
  return out;
}

function resolveFile(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath.split("?")[0]));
  const target = path.join(root, clean);
  if (!target.startsWith(root)) return null;
  try {
    const stat = statSync(target);
    if (stat.isDirectory()) return resolveFile(path.join(clean, "index.html"));
    return target;
  } catch {
    return null;
  }
}

createServer((req, res) => {
  const file = resolveFile(req.url ?? "/");
  const status = file ? 200 : 404;
  const body = file ?? path.join(root, "404.html");
  res.writeHead(status, {
    ...headersFor((req.url ?? "/").split("?")[0]),
    "content-type": types[path.extname(body)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(body).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}`);
});
