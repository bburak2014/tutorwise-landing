// Küçük bir headless Chrome sürücüsü (Chrome DevTools Protocol). Her
// çalıştırmada geçici bir profil açılır; kullanıcının Chrome profiline
// dokunulmaz ve iş bitince profil silinir.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import WebSocket from "ws";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function launchChrome({ port = 9333, args = [] } = {}) {
  const profile = mkdtempSync(path.join(tmpdir(), "tutorwise-chrome-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--enable-unsafe-swiftshader",
      ...args,
    ],
    { stdio: "ignore" },
  );
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/json/version`);
      break;
    } catch {
      await wait(100);
    }
  }
  return {
    async newPage() {
      const res = await fetch(`${base}/json/new?about:blank`, { method: "PUT" });
      const { id, webSocketDebuggerUrl } = await res.json();
      const page = await Page.connect(webSocketDebuggerUrl);
      // Sekme kapanınca sekme de kapanır: arka planda kalan sekmeler kare
      // üretmez ve ekran görüntüsünü bekletir.
      page.closeTarget = () => fetch(`${base}/json/close/${id}`).catch(() => {});
      return page;
    },
    async close() {
      proc.kill("SIGTERM");
      await wait(300);
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

class Page {
  static async connect(url) {
    const socket = new WebSocket(url, { perMessageDeflate: false });
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    const page = new Page(socket);
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Log.enable");
    await page.send("Network.enable");
    return page;
  }

  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.failedRequests = [];
    socket.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
        return;
      }
      for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
    });
    this.on("Runtime.exceptionThrown", (p) =>
      this.consoleErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text),
    );
    this.on("Runtime.consoleAPICalled", (p) => {
      const text = p.args.map((a) => a.value ?? a.description).join(" ");
      if (p.type === "error") this.consoleErrors.push(text);
      if (p.type === "warning") this.consoleWarnings.push(text);
    });
    // CSP ihlalleri ve ağ hataları tarayıcı günlüğüne düşer.
    this.on("Log.entryAdded", ({ entry }) => {
      if (entry.level === "error") this.consoleErrors.push(`[${entry.source}] ${entry.text}`);
      if (entry.level === "warning") this.consoleWarnings.push(`[${entry.source}] ${entry.text}`);
    });
    this.on("Network.responseReceived", (p) => {
      if (p.response.status >= 400)
        this.failedRequests.push(`${p.response.status} ${p.response.url}`);
    });
  }

  on(method, fn) {
    const list = this.listeners.get(method) ?? [];
    list.push(fn);
    this.listeners.set(method, list);
  }

  /** Her komut en fazla `timeout` ms bekler; yanıt gelmezse hata verir. */
  send(method, params = {}, timeout = 45_000) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method}: ${timeout / 1000} sn içinde yanıt yok`));
      }, timeout);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  async viewport(width, height, { dpr = 1, mobile = false } = {}) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: dpr,
      mobile,
    });
  }

  async media(features) {
    await this.send("Emulation.setEmulatedMedia", { features });
  }

  async goto(url, { settle = 600, timeout = 45_000 } = {}) {
    const loaded = new Promise((resolve) => this.on("Page.loadEventFired", resolve));
    await this.send("Page.bringToFront");
    await this.send("Page.navigate", { url });
    const late = wait(timeout).then(() => {
      throw new Error(`${url}: ${timeout / 1000} sn içinde yüklenmedi`);
    });
    await Promise.race([loaded, late]);
    await wait(settle);
  }

  async eval(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }

  async screenshot(file, { format = "png", quality } = {}) {
    await this.send("Page.bringToFront");
    const { data } = await this.send("Page.captureScreenshot", { format, quality });
    writeFileSync(file, Buffer.from(data, "base64"));
  }

  close() {
    this.socket.close();
    return this.closeTarget?.();
  }
}

export { wait };
