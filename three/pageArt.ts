/* Sayfa görselleri (ödev sahnesindeki kâğıtlar, ekran yer tutucuları): yazısız, soyut arayüz çizimleri. Her açılım
   bir özellik bölümünü karşılar (takvim, tahta, ödev, tahsilat, veli özeti).
   Dilden bağımsızdır; tuvalde (Canvas 2D) çizilip dokuya dönüşür.
   Ön yüzlerde cilt yeri (gutter) solda, arka yüzlerde sağdadır. */

export type PageArt =
  | "cover"
  | "title"
  | "endpaper"
  | "month"
  | "agenda"
  | "sketch"
  | "pdf"
  | "checklist"
  | "assignment"
  | "package"
  | "payments"
  | "chat"
  | "summary"
  | "lines";

const PAPER = "#f5f2ea";
const INK = "#1b2358";
const BRAND = "#2338a8";
const MARKER = "#ffd84a";
const NAVY = "#141c4d";
const faint = "rgba(27,35,88,0.12)";
const soft = "rgba(27,35,88,0.28)";

type Ctx = CanvasRenderingContext2D;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function bar(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
}

/** Metin satırı yerine kalın, yuvarlak uçlu çizgiler. */
function textLines(ctx: Ctx, x: number, y: number, w: number, count: number, s: number, gap = 26) {
  for (let i = 0; i < count; i++) {
    const width = i === count - 1 ? w * 0.55 : w * (0.82 + ((i * 37) % 17) / 100);
    bar(ctx, x, y + i * gap * s, Math.min(w, width), 7 * s, faint);
  }
}

function heading(ctx: Ctx, x: number, y: number, w: number, s: number) {
  bar(ctx, x, y, w, 14 * s, INK);
  bar(ctx, x, y + 26 * s, w * 0.6, 8 * s, soft);
}

function bookMark(ctx: Ctx, cx: number, cy: number, size: number, stroke: string, width: number) {
  const k = size / 64;
  ctx.save();
  ctx.translate(cx - 32 * k, cy - 32 * k);
  ctx.scale(k, k);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width / k;
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D("M15 18c7-2 12 0 17 4 5-4 10-6 17-4v29c-6-2-12 0-17 4-5-4-11-6-17-4Z"));
  ctx.stroke(new Path2D("M32 22v29"));
  ctx.restore();
}

type Point = [number, number];

/** Noktalardan geçen tek bir çizgi. */
function trace(ctx: Ctx, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.stroke();
}

function traceArc(ctx: Ctx, cx: number, cy: number, r: number, from: number, to: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, from, to);
  ctx.stroke();
}

/** Kübik Bézier eğrisinden noktalar. */
function bezier(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  });
}

const draw: Record<PageArt, (ctx: Ctx, w: number, h: number, s: number, m: number) => void> = {
  cover(ctx, w, h, s) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    // Kumaş dokusu: ince, rastgele lifler.
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(rand() * w, rand() * h, 1.2 * s + rand() * 2 * s, 1.2 * s);
    }
    const glow = ctx.createRadialGradient(w * 0.55, h * 0.35, 0, w * 0.55, h * 0.35, w);
    glow.addColorStop(0, "rgba(142,160,255,0.10)");
    glow.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Kapağın logosu artık 3D logo (three/scenes/Logo.tsx); burada yalnız kumaş.
  },
  title(ctx, w, h, s) {
    bookMark(ctx, w / 2, h * 0.36, 150 * s, NAVY, 5 * s);
    bar(ctx, w * 0.3, h * 0.52, w * 0.4, 16 * s, INK);
    bar(ctx, w * 0.36, h * 0.52 + 34 * s, w * 0.28, 8 * s, soft);
    ctx.fillStyle = MARKER;
    rr(ctx, w / 2 - 24 * s, h * 0.62, 48 * s, 6 * s, 3 * s);
    ctx.fill();
  },
  endpaper(ctx, w, h, s) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1.5 * s;
    for (let x = -h; x < w; x += 28 * s) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }
    bookMark(ctx, w / 2, h / 2, 120 * s, MARKER, 4 * s);
  },
  month(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.45, s);
    const top = m + 90 * s;
    const cell = (w - m * 2) / 7;
    const rows = 5;
    const rowH = Math.min(cell * 1.05, (h - top - m) / rows);
    for (let c = 0; c < 7; c++) bar(ctx, m + c * cell + cell * 0.3, top - 30 * s, cell * 0.4, 6 * s, soft);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 7; c++) {
        const x = m + c * cell + 4 * s;
        const y = top + r * rowH + 4 * s;
        ctx.strokeStyle = faint;
        ctx.lineWidth = 2 * s;
        rr(ctx, x, y, cell - 8 * s, rowH - 8 * s, 10 * s);
        ctx.stroke();
        const n = r * 7 + c;
        if (n % 5 === 1 || n % 7 === 3) bar(ctx, x + 10 * s, y + rowH - 30 * s, cell * 0.5, 8 * s, "rgba(35,56,168,0.55)");
        if (n === 17) {
          ctx.fillStyle = "rgba(255,216,74,0.85)";
          rr(ctx, x, y, cell - 8 * s, rowH - 8 * s, 10 * s);
          ctx.fill();
        }
      }
    }
  },
  agenda(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.5, s);
    const top = m + 90 * s;
    const hour = (h - top - m) / 9;
    for (let i = 0; i < 9; i++) {
      const y = top + i * hour;
      bar(ctx, m, y - 3 * s, 34 * s, 6 * s, soft);
      ctx.fillStyle = faint;
      ctx.fillRect(m + 50 * s, y, w - m * 2 - 50 * s, 2 * s);
    }
    const blocks: [number, number, string][] = [
      [0.4, 1.6, "rgba(35,56,168,0.14)"],
      [2.5, 1.2, "rgba(255,216,74,0.9)"],
      [4.4, 1.8, "rgba(35,56,168,0.14)"],
      [6.8, 1.1, "rgba(35,56,168,0.14)"],
    ];
    for (const [start, len, color] of blocks) {
      const x = m + 62 * s;
      const y = top + start * hour;
      ctx.fillStyle = color;
      rr(ctx, x, y, w - x - m, len * hour - 8 * s, 14 * s);
      ctx.fill();
      ctx.fillStyle = color.startsWith("rgba(255") ? INK : BRAND;
      rr(ctx, x, y, 6 * s, len * hour - 8 * s, 3 * s);
      ctx.fill();
      bar(ctx, x + 22 * s, y + 18 * s, (w - x - m) * 0.5, 9 * s, color.startsWith("rgba(255") ? INK : "rgba(35,56,168,0.75)");
      bar(ctx, x + 22 * s, y + 40 * s, (w - x - m) * 0.32, 6 * s, soft);
    }
  },
  sketch(ctx, w, h, s, m) {
    ctx.strokeStyle = "rgba(27,35,88,0.08)";
    ctx.lineWidth = 1.5 * s;
    for (let x = m; x < w - m; x += 32 * s) {
      for (let y = m; y < h - m; y += 32 * s) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Tahtadaki gibi elle çizilmiş: üçgen, açı yayı, yükseklik, fosforlu kalem ve çember.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5 * s;
    const ax = w * 0.2, ay = h * 0.62, bx = w * 0.8, by = h * 0.62, cx = w * 0.42, cy = h * 0.28;
    trace(ctx, [[ax, ay], [bx, by], [cx, cy], [ax, ay]]);
    ctx.strokeStyle = BRAND;
    ctx.lineWidth = 4 * s;
    traceArc(ctx, ax, ay, 60 * s, -0.95, 0);
    ctx.setLineDash([12 * s, 10 * s]);
    trace(ctx, [[cx, cy], [cx, ay]]);
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,216,74,0.9)";
    ctx.lineWidth = 22 * s;
    trace(ctx, bezier([w * 0.22, h * 0.78], [w * 0.4, h * 0.76], [w * 0.55, h * 0.8], [w * 0.74, h * 0.77], 12));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4 * s;
    traceArc(ctx, w * 0.72, h * 0.3, 58 * s, -Math.PI / 2, Math.PI * 1.5);
  },
  pdf(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.6, s);
    textLines(ctx, m, m + 80 * s, w - m * 2, 6, s);
    ctx.fillStyle = "rgba(255,216,74,0.75)";
    rr(ctx, m - 6 * s, m + 80 * s + 2 * 26 * s - 8 * s, (w - m * 2) * 0.9, 22 * s, 4 * s);
    ctx.fill();
    textLines(ctx, m, m + 80 * s + 2 * 26 * s, w - m * 2, 1, s);
    ctx.strokeStyle = faint;
    ctx.lineWidth = 2 * s;
    rr(ctx, m, h * 0.42, w - m * 2, h * 0.26, 16 * s);
    ctx.stroke();
    ctx.strokeStyle = BRAND;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(m + 30 * s, h * 0.64);
    ctx.bezierCurveTo(w * 0.35, h * 0.45, w * 0.55, h * 0.62, w - m - 30 * s, h * 0.46);
    ctx.stroke();
    textLines(ctx, m, h * 0.73, w - m * 2, 5, s);
    ctx.strokeStyle = "#e0533d";
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.ellipse(w * 0.62, h * 0.82, 90 * s, 32 * s, -0.08, 0, Math.PI * 2);
    ctx.stroke();
  },
  checklist(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.5, s);
    const rowH = 92 * s;
    for (let i = 0; i < 7; i++) {
      const y = m + 100 * s + i * rowH;
      if (y + rowH > h - m) break;
      const done = i < 3;
      ctx.strokeStyle = done ? BRAND : soft;
      ctx.fillStyle = done ? BRAND : "transparent";
      ctx.lineWidth = 3 * s;
      rr(ctx, m, y, 34 * s, 34 * s, 9 * s);
      if (done) ctx.fill();
      ctx.stroke();
      if (done) {
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(m + 8 * s, y + 17 * s);
        ctx.lineTo(m + 15 * s, y + 25 * s);
        ctx.lineTo(m + 27 * s, y + 10 * s);
        ctx.stroke();
      }
      bar(ctx, m + 56 * s, y + 6 * s, (w - m * 2 - 56 * s) * (0.5 + ((i * 29) % 40) / 100), 9 * s, done ? soft : INK);
      bar(ctx, m + 56 * s, y + 26 * s, (w - m * 2) * 0.3, 6 * s, faint);
    }
  },
  assignment(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.55, s);
    textLines(ctx, m, m + 80 * s, w - m * 2, 4, s);
    const chipY = m + 210 * s;
    for (let i = 0; i < 2; i++) {
      const x = m + i * ((w - m * 2) / 2 + 6 * s);
      const cw = (w - m * 2) / 2 - 6 * s;
      ctx.strokeStyle = faint;
      ctx.lineWidth = 2 * s;
      rr(ctx, x, chipY, cw, 64 * s, 14 * s);
      ctx.stroke();
      ctx.fillStyle = i === 0 ? "#e0533d" : BRAND;
      rr(ctx, x + 14 * s, chipY + 14 * s, 30 * s, 36 * s, 6 * s);
      ctx.fill();
      bar(ctx, x + 56 * s, chipY + 20 * s, cw * 0.5, 8 * s, soft);
      bar(ctx, x + 56 * s, chipY + 38 * s, cw * 0.3, 6 * s, faint);
    }
    const vy = chipY + 96 * s;
    const vh = Math.min(h * 0.32, h - vy - m - 60 * s);
    ctx.fillStyle = NAVY;
    rr(ctx, m, vy, w - m * 2, vh, 18 * s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(w / 2, vy + vh / 2, 34 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 9 * s, vy + vh / 2 - 15 * s);
    ctx.lineTo(w / 2 + 16 * s, vy + vh / 2);
    ctx.lineTo(w / 2 - 9 * s, vy + vh / 2 + 15 * s);
    ctx.fill();
    bar(ctx, m + 20 * s, vy + vh - 26 * s, w - m * 2 - 40 * s, 5 * s, "rgba(255,255,255,0.25)");
    bar(ctx, m + 20 * s, vy + vh - 26 * s, (w - m * 2 - 40 * s) * 0.38, 5 * s, MARKER);
    ctx.fillStyle = MARKER;
    ctx.beginPath();
    ctx.arc(m + 20 * s + (w - m * 2 - 40 * s) * 0.62, vy + vh - 23.5 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    textLines(ctx, m, vy + vh + 34 * s, w - m * 2, 2, s);
  },
  package(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.5, s);
    const cx = w / 2;
    const cy = m + 110 * s + 150 * s;
    const r = Math.min(150 * s, w * 0.28);
    ctx.lineCap = "round";
    ctx.lineWidth = 26 * s;
    ctx.strokeStyle = "rgba(35,56,168,0.12)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = BRAND;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.72);
    ctx.stroke();
    ctx.strokeStyle = MARKER;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2 + Math.PI * 2 * 0.72, -Math.PI / 2 + Math.PI * 2 * 0.86);
    ctx.stroke();
    bar(ctx, cx - 50 * s, cy - 14 * s, 100 * s, 18 * s, INK);
    bar(ctx, cx - 34 * s, cy + 16 * s, 68 * s, 8 * s, soft);
    const ly = cy + r + 70 * s;
    for (let i = 0; i < 3; i++) {
      const y = ly + i * 60 * s;
      if (y > h - m) break;
      ctx.fillStyle = [BRAND, MARKER, "rgba(35,56,168,0.12)"][i];
      ctx.beginPath();
      ctx.arc(m + 10 * s, y + 4 * s, 9 * s, 0, Math.PI * 2);
      ctx.fill();
      bar(ctx, m + 34 * s, y, (w - m * 2) * 0.45, 9 * s, soft);
      bar(ctx, w - m - 80 * s, y, 80 * s, 9 * s, INK);
    }
  },
  payments(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.45, s);
    const rowH = 84 * s;
    for (let i = 0; i < 8; i++) {
      const y = m + 96 * s + i * rowH;
      if (y + rowH > h - m) break;
      const pending = i === 2;
      if (pending) {
        ctx.fillStyle = "rgba(255,216,74,0.55)";
        rr(ctx, m - 12 * s, y - 12 * s, w - m * 2 + 24 * s, rowH - 10 * s, 14 * s);
        ctx.fill();
      }
      ctx.fillStyle = pending ? INK : "rgba(35,56,168,0.14)";
      ctx.beginPath();
      ctx.arc(m + 22 * s, y + 20 * s, 22 * s, 0, Math.PI * 2);
      ctx.fill();
      bar(ctx, m + 62 * s, y + 8 * s, (w - m * 2) * (0.32 + ((i * 13) % 20) / 100), 9 * s, INK);
      bar(ctx, m + 62 * s, y + 28 * s, (w - m * 2) * 0.22, 6 * s, soft);
      bar(ctx, w - m - 92 * s, y + 12 * s, 92 * s, 11 * s, pending ? INK : BRAND);
      ctx.fillStyle = faint;
      ctx.fillRect(m, y + rowH - 18 * s, w - m * 2, 1.5 * s);
    }
  },
  chat(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.4, s);
    let y = m + 100 * s;
    const bubbles: [boolean, number, number][] = [
      [false, 0.62, 2],
      [true, 0.5, 1],
      [false, 0.7, 3],
      [true, 0.56, 2],
      [false, 0.42, 1],
    ];
    for (const [mine, width, lines] of bubbles) {
      const bw = (w - m * 2) * width;
      const bh = (28 + lines * 22) * s;
      if (y + bh > h - m) break;
      const x = mine ? w - m - bw : m;
      ctx.fillStyle = mine ? BRAND : "rgba(27,35,88,0.07)";
      rr(ctx, x, y, bw, bh, 22 * s);
      ctx.fill();
      for (let l = 0; l < lines; l++)
        bar(ctx, x + 22 * s, y + 18 * s + l * 22 * s, bw * (l === lines - 1 ? 0.5 : 0.78), 7 * s, mine ? "rgba(255,255,255,0.7)" : soft);
      y += bh + 26 * s;
    }
  },
  summary(ctx, w, h, s, m) {
    heading(ctx, m, m, w * 0.55, s);
    const chartTop = m + 110 * s;
    const chartH = h * 0.3;
    const cols = 7;
    const cw = (w - m * 2) / cols;
    const values = [0.45, 0.7, 0.35, 0.9, 0.6, 0.78, 0.5];
    values.forEach((v, i) => {
      const bh = chartH * v;
      ctx.fillStyle = i === 3 ? MARKER : "rgba(35,56,168,0.55)";
      rr(ctx, m + i * cw + cw * 0.22, chartTop + chartH - bh, cw * 0.56, bh, 10 * s);
      ctx.fill();
    });
    ctx.fillStyle = faint;
    ctx.fillRect(m, chartTop + chartH + 8 * s, w - m * 2, 2 * s);
    let y = chartTop + chartH + 60 * s;
    for (let i = 0; i < 3; i++) {
      if (y > h - m - 40 * s) break;
      ctx.fillStyle = [BRAND, MARKER, BRAND][i];
      ctx.beginPath();
      ctx.arc(m + 8 * s, y + 4 * s, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      textLines(ctx, m + 30 * s, y, w - m * 2 - 30 * s, 2, s, 22);
      y += 92 * s;
    }
  },
  lines(ctx, w, h, s, m) {
    for (let y = m + 60 * s; y < h - m; y += 34 * s) {
      ctx.fillStyle = "rgba(35,56,168,0.09)";
      ctx.fillRect(m * 0.6, y, w - m * 1.2, 1.5 * s);
    }
  },
};

/** Bir sayfa yüzünü tuvale çizer. `gutter`: cilt yerinin hangi kenarda olduğu. */
export function drawPage(art: PageArt, gutter: "left" | "right", width: number): HTMLCanvasElement {
  const height = Math.round(width * (1.71 / 1.28));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const s = width / 640;
  const m = 64 * s;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  if (art === "cover") {
    draw.cover(ctx, width, height, s, m);
    return canvas;
  }
  ctx.save();
  // Cilt yeri: hafif gölge ve iç kenar boşluğu.
  const inner = gutter === "left" ? 0 : width;
  const shade = ctx.createLinearGradient(inner, 0, gutter === "left" ? width * 0.16 : width * 0.84, 0);
  shade.addColorStop(0, "rgba(20,28,77,0.16)");
  shade.addColorStop(1, "rgba(20,28,77,0)");
  ctx.translate(gutter === "left" ? m * 0.35 : -m * 0.35, 0);
  draw[art](ctx, width, height, s, m);
  ctx.restore();
  if (art !== "endpaper") {
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  }
  return canvas;
}
