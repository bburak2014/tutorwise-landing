// Uygulamanın gerçek ekranlarını her dilde çeker ve cihaz ekranları için
// public/screens/<dil>/<ekran>.webp olarak kaydeder.
//
// Ana depoda (derslik) hiçbir dosya değiştirilmez; yalnız onun yerel test
// düzeneği çalıştırılır: gerçek Nest API'si gömülü Postgres ile 127.0.0.1:3101,
// web üretim derlemesi sahte Supabase ile 127.0.0.1:3100. Ürettiği dosyalar
// (reports/security/landing-*.json) ana depoda git'e girmez ve iş bitince silinir.
//
// Önce ana depoda bir kez: pnpm api:build && pnpm web:build
// Kullanım: node scripts/capture-screens.mjs [--app ../derslik] [--locales tr,en]
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { writeSmallScreen } from "./screens-small.mjs";
import { launchChrome, wait } from "./lib/cdp.mjs";
import { BOARD_LABEL, WEEK_LABEL, demoData, demoLocales } from "./demo-data.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);
const app = path.resolve(args.app ?? "../derslik");
const locales = args.locales ? args.locales.split(",") : demoLocales;
const fixtureFile = path.join(app, "reports/security/landing-backend-fixture.json");
const sessionFile = path.join(app, "reports/security/landing-web-session.json");
const rawDir = path.resolve("reports/screens");

const SCREENS = [
  { id: "calendar", actor: "owner", device: "tablet", path: "/?view=calendar", week: true },
  { id: "board", actor: "owner", device: "tablet", path: "/?view=calendar", openBoard: true },
  { id: "packages", actor: "owner", device: "tablet", path: "/?view=payments" },
  { id: "homework", actor: "student", device: "phone", path: "/?view=assignments" },
  { id: "summary", actor: "guardian", device: "phone", path: "/?view=notes" },
];
const DEVICE = {
  tablet: { width: 1180, height: 820, dpr: 2, mobile: false, out: 1600 },
  phone: { width: 390, height: 844, dpr: 3, mobile: true, out: 780 },
};

function start(name, argv, env) {
  const child = spawn(process.execPath, argv, {
    cwd: app,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.logs = "";
  const keep = (data) => (child.logs = (child.logs + data).slice(-6000));
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  child.label = name;
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    return;
  }
  const timeout = wait(20_000).then(() => "timeout");
  if ((await Promise.race([exited, timeout])) === "timeout") {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* zaten kapandı */
    }
  }
}

async function waitForFile(file, child, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
    if (child.exitCode !== null) throw new Error(`${child.label} kapandı:\n${child.logs}`);
    await wait(500);
  }
  throw new Error(`${child.label} ${timeoutMs / 1000} sn içinde hazır olmadı:\n${child.logs}`);
}

function client(fixture) {
  return async (method, route, body, actor = "owner") => {
    const res = await fetch(fixture.base + route, {
      method,
      headers: {
        Authorization: `Bearer ${fixture.actors[actor].token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${JSON.stringify(json)}`);
    return json.data ?? json;
  };
}

/** İstanbul saatiyle bugünden `days` gün sonrası (YYYY-MM-DD). */
function istanbulDay(days) {
  const date = new Date(Date.now() + 3 * 3600_000 + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}
const at = (day, time) => new Date(`${day}T${time}:00+03:00`).toISOString();
function mondayOfWeek() {
  const today = new Date(`${istanbulDay(0)}T12:00:00Z`);
  const back = (today.getUTCDay() + 6) % 7;
  return istanbulDay(-back);
}

/** Bir dilin örnek verisini API'ye yükler. */
async function seed(call, fixture, d) {
  const ws = fixture.workspaceId;
  const W = (suffix) => `/v1/workspaces/${ws}/${suffix}`;

  const main = await call("GET", W(`students/${fixture.studentId}`));
  await call("PATCH", W(`students/${fixture.studentId}`), {
    name: d.student.name,
    grade: d.student.grade,
    subject: d.student.subject,
    phone: "",
    email: main.email ?? "",
    version: main.version,
  });
  const students = [{ id: fixture.studentId, ...d.student }];
  for (const other of d.others) {
    const created = await call("POST", W("students"), { ...other, phone: "", email: "" });
    students.push({ id: created.id, ...other });
  }

  const packs = [];
  for (const [i, student] of students.entries()) {
    const pack = await call("POST", W("packages"), {
      studentId: student.id,
      name: d.pack,
      granted: 8,
      priceMinor: String(320000 + i * 40000),
      expiresOn: null,
    });
    packs.push(pack);
  }

  // Bu haftanın dersleri. Takvim bugünü açar: ilk ders (bugün 15:00) ana
  // öğrencinin, görüşme bağlantılı ve tahtası çizili.
  const plan = [
    [0, 0, "15:00", 0, true],
    [1, 0, "17:00", 2, false],
    [3, 0, "19:00", 3, false],
    [0, 1, "16:00", 1, true],
    [2, 1, "18:30", 4, false],
    [1, 3, "16:30", 2, false],
    [2, 4, "11:00", 5, false],
    [3, 5, "14:00", 3, false],
  ];
  const lessons = [];
  for (const [who, day, time, topic, meet] of plan) {
    const created = await call("POST", W("sessions"), {
      studentId: students[who].id,
      packageId: packs[who].id,
      startsAt: at(istanbulDay(day), time),
      weeks: 1,
      topic: d.topics[topic],
      duration: 60,
      location: d.location,
      ...(meet ? { meetingUrl: "https://meet.google.com/abc-defg-hij" } : {}),
    });
    lessons.push(created.lessons?.[0] ?? created);
  }

  await call("PUT", W("booking"), {
    enabled: true,
    durationMinutes: 60,
    noticeHours: 12,
    cancelHours: 24,
    location: d.location,
    windows: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "14:00", end: "20:00" })),
    blocks: [],
    version: 0,
  });

  // Dördüncü öğrencinin paketi ödenmemiş kalır: "bekleyen tahsilat" dolu görünsün.
  for (const [i, reference] of d.payments.slice(0, 3).entries()) {
    await call("POST", W("payments"), {
      studentId: students[i % students.length].id,
      amountMinor: String(320000 + (i % students.length) * 40000),
      receivedOn: istanbulDay(-3 - i * 6),
      method: i % 2 ? "CASH" : "TRANSFER",
      reference,
    });
  }

  const learning = W(`students/${fixture.studentId}/learning`);
  const portal = `/v1/portal/${ws}/${fixture.studentId}/actions`;
  for (const [i, [title, instructions, answer, feedback]] of d.assignments.entries()) {
    const assignment = await call("POST", learning, {
      action: "assignment.create",
      title,
      instructions,
      dueOn: istanbulDay(2 + i * 2),
    });
    if (!answer) continue;
    const submission = await call(
      "POST",
      portal,
      { action: "assignment.submit", assignmentId: assignment.id, body: answer, version: assignment.version ?? 0 },
      "student",
    );
    if (feedback)
      await call("POST", learning, {
        action: "assignment.review",
        submissionId: submission.id,
        feedback,
        version: submission.version ?? 0,
      });
  }
  await call("POST", learning, { action: "note.publish", body: d.note, audience: "BOTH" });
  const draft = await call("POST", learning, { action: "summary.draft", weekOn: mondayOfWeek() });
  await call("POST", learning, {
    action: "summary.publish",
    summaryId: draft.id,
    body: d.summary,
    version: draft.version ?? 0,
  });

  // Ortak tahta: üçgen, yükseklik, çember, vurgulama ve formül notu.
  const board = W(`students/${fixture.studentId}/lessons/${lessons[0].id}/board`);
  const strokes = [
    { tool: "pen", color: "#172554", width: 4, points: [{ x: 0.18, y: 0.7 }, { x: 0.52, y: 0.7 }, { x: 0.3, y: 0.28 }, { x: 0.18, y: 0.7 }] },
    { tool: "line", color: "#2563eb", width: 2, points: [{ x: 0.3, y: 0.28 }, { x: 0.3, y: 0.7 }] },
    { tool: "ellipse", color: "#dc2626", width: 4, points: [{ x: 0.62, y: 0.22 }, { x: 0.8, y: 0.48 }] },
    { tool: "highlighter", color: "#16a34a", width: 8, points: [{ x: 0.18, y: 0.8 }, { x: 0.35, y: 0.79 }, { x: 0.52, y: 0.8 }] },
    { tool: "note", color: "#172554", width: 2, points: [{ x: 0.6, y: 0.62 }], text: "A = ½ · a · h" },
  ];
  for (const stroke of strokes)
    await call("POST", board, { action: "stroke.add", epoch: 0, stroke: { id: randomUUID(), ...stroke } });
}

/** Sayfadaki "Derslik" yazılarını ve düzeneğin etiketlerini değiştirir.
 *  `pairs` metnin içinde, `exact` yalnız tam olarak o metinden oluşan
 *  düğümlerde (hesap adı "owner", avatar baş harfi "O") uygulanır. */
function replaceScript(pairs, exact) {
  return `(() => {
    const pairs = ${JSON.stringify(pairs)};
    const exact = new Map(${JSON.stringify(exact)});
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node, changed = 0;
    while ((node = walker.nextNode())) {
      let text = node.nodeValue;
      const whole = exact.get(text.trim());
      if (whole) text = text.replace(text.trim(), whole);
      for (const [from, to] of pairs) if (text.includes(from)) text = text.split(from).join(to);
      if (text !== node.nodeValue) { node.nodeValue = text; changed++; }
    }
    return changed;
  })()`;
}

async function settle(page) {
  for (let i = 0; i < 40; i++) {
    const busy = await page.eval(
      `document.readyState !== "complete" || document.querySelector(".animate-pulse, [data-slot=skeleton], [aria-busy=true]") !== null`,
    );
    if (!busy) break;
    await wait(250);
  }
  await wait(1200);
}

async function capture(chrome, sessions, locale, d, fixture) {
  const pairs = [
    ["Security fixture other teacher", d.teacher],
    ["Security fixture teacher", d.teacher],
    ["Security fixture student", d.student.name],
    [fixture.actors.owner.email, "teacher@tutorwise.academy"],
    [fixture.actors.student.email, "student@tutorwise.academy"],
    [fixture.actors.guardian.email, "parent@tutorwise.academy"],
    ["DERSLİK", "TUTORWISE"],
    ["DERSLIK", "TUTORWISE"],
    ["Derslik", "Tutorwise"],
    ["derslik", "tutorwise"],
  ];
  mkdirSync(path.join(rawDir, locale), { recursive: true });
  mkdirSync(path.resolve("public/screens", locale), { recursive: true });
  for (const screen of SCREENS) {
    try {
      await shoot(screen);
    } catch (error) {
      console.warn(`  ${locale}/${screen.id} yeniden deneniyor: ${error.message}`);
      await shoot(screen);
    }
  }

  async function shoot(screen) {
    const account = sessions.accounts.find((a) => a.name === screen.actor);
    const device = DEVICE[screen.device];
    const page = await chrome.newPage();
    try {
      await page.send("Network.clearBrowserCookies");
      const cookies = `${account.cookie}; derslik-locale=${locale}; derslik-theme=light`;
      for (const pair of cookies.split(/;\s*/).filter(Boolean)) {
        const at = pair.indexOf("=");
        await page.send("Network.setCookie", {
          name: pair.slice(0, at),
          value: pair.slice(at + 1),
          url: sessions.origin,
          httpOnly: !pair.startsWith("derslik-"),
        });
      }
      await page.viewport(device.width, device.height, { dpr: device.dpr, mobile: device.mobile });
      await page.goto(sessions.origin + screen.path, { settle: 600 });
      await settle(page);
      if (screen.week) {
        // Radix sekmeleri tıklamayla değil mousedown ile seçilir.
        await page.eval(`(() => {
          const tab = [...document.querySelectorAll("[role=tab]")].find((b) => b.textContent.trim() === ${JSON.stringify(WEEK_LABEL[locale])});
          tab?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
          tab?.focus();
        })()`);
        await wait(800);
        await settle(page);
      }
      if (screen.openBoard) {
        // Çizimli tahta ana öğrencinin dersinde: onun satırındaki düğme.
        const clicked = await page.eval(`(() => {
          const label = ${JSON.stringify(BOARD_LABEL[locale])};
          const name = "Security fixture student";
          const depth = (button) => {
            let el = button;
            for (let i = 0; i < 12 && el; i++, el = el.parentElement)
              if (el.textContent.includes(name) || el.textContent.includes(${JSON.stringify(d.student.name)})) return i;
            return 99;
          };
          const buttons = [...document.querySelectorAll("button")]
            .filter((b) => b.textContent.trim() === label && !b.disabled)
            .sort((a, b) => depth(a) - depth(b));
          const button = buttons[0];
          button?.click();
          return Boolean(button);
        })()`);
        if (!clicked) throw new Error(`${locale}: tahta düğmesi bulunamadı`);
        await wait(1500);
        await settle(page);
        await wait(1500);
      }
      const names = { owner: d.teacher, student: d.student.name, guardian: d.guardian };
      const local = fixture.actors[screen.actor].email.split("@")[0];
      const own = names[screen.actor];
      await page.eval(replaceScript(pairs, [[local, own], [local[0].toUpperCase(), [...own][0]]]));
      await wait(200);
      const file = path.join(rawDir, locale, `${screen.id}.png`);
      await page.screenshot(file);
      await sharp(file)
        .resize({ width: device.out })
        .webp({ quality: 84, effort: 6 })
        .toFile(path.resolve("public/screens", locale, `${screen.id}.webp`));
      await writeSmallScreen(path.resolve("public/screens", locale, `${screen.id}.webp`));
      if (page.consoleErrors.length) console.warn(`  ${locale}/${screen.id} konsol:`, page.consoleErrors.slice(0, 3));
    } finally {
      await page.close();
    }
    console.log(`  ${locale}/${screen.id} ✓`);
  }
}

async function runLocale(locale) {
  const d = demoData(locale);
  rmSync(fixtureFile, { force: true });
  rmSync(sessionFile, { force: true });
  let api;
  let web;
  let chrome;
  try {
    api = start("API düzeneği", ["apps/api/tests/run.mjs"], {
      DERSLIK_SECURITY_FIXTURE_FILE: fixtureFile,
      DERSLIK_SECURITY_FIXTURE_ONLY: "1",
      DERSLIK_SECURITY_HOLD_MS: "900000",
    });
    const fixture = await waitForFile(fixtureFile, api, 240_000);
    web = start("web düzeneği", ["tests/web-security-harness.mjs", "--serve"], {
      WEB_SECURITY_FIXTURE: fixtureFile,
      WEB_SECURITY_BACKEND: fixture.base,
      WEB_SECURITY_SESSION: sessionFile,
      WEB_SECURITY_PORT: "3100",
    });
    const sessions = await waitForFile(sessionFile, web, 120_000);
    await seed(client(fixture), fixture, d);
    console.log(`  ${locale}: örnek veri yüklendi`);
    chrome = await launchChrome({ port: 9335 });
    await capture(chrome, sessions, locale, d, fixture);
  } finally {
    await chrome?.close();
    await stop(web);
    await stop(api);
    rmSync(fixtureFile, { force: true });
    rmSync(sessionFile, { force: true });
  }
}

const report = [];
for (const locale of locales) {
  console.log(`${locale}:`);
  try {
    await runLocale(locale);
    report.push([locale, "ok"]);
  } catch (error) {
    console.error(`  ${locale} başarısız: ${error.message}`);
    report.push([locale, error.message.split("\n")[0]]);
  }
}
writeFileSync(path.join(rawDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (report.some(([, status]) => status !== "ok")) process.exitCode = 1;
