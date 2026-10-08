/* Nesnelerin yüzlerindeki çizimler (Canvas 2D): ders kartları, takvim
   yaprağı, video kartı, ders hakkı parası, tahta ızgarası. Yazı
   yok (dilden bağımsız); yalnız rakam ve şekil. */
import { MARK_VIEWBOX, brand, capParts, markParts } from "@/lib/brand.ts";

const NAVY = "#141c4d";
const MARKER = "#ffd84a";
const soft = "rgba(20,28,77,0.3)";

type Ctx = CanvasRenderingContext2D;

function canvas(width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  if (ctx) draw(ctx, width, height);
  return el;
}

function pill(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
}

/** Ders kartı: solda renkli şerit, öğrenci baş harfi dairesi, iki satır, saat. */
export function lessonCard(accent: string) {
  return canvas(512, 168, (ctx, w, h) => {
    ctx.fillStyle = "#f7f8fd";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 18, h);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(84, h / 2, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    pill(ctx, 146, 46, 220, 22, NAVY);
    pill(ctx, 146, 92, 150, 16, soft);
    pill(ctx, 392, 64, 86, 34, accent);
  });
}

/** Takvim yaprağı: turuncu başlık bandı ve büyük gün rakamı. */
export function dateTile(day: number) {
  return canvas(360, 400, (ctx, w, h) => {
    ctx.fillStyle = "#f7f8fd";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = brand.orange;
    ctx.fillRect(0, 0, w, 104);
    pill(ctx, 110, 40, 140, 24, "rgba(255,255,255,0.8)");
    ctx.fillStyle = NAVY;
    ctx.font = "800 190px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(day), w / 2, 258);
  });
}

/** Video kartı: lacivert zemin, ortada oynat düğmesi, altta ilerleme çubuğu. */
export function videoCard() {
  return canvas(512, 288, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1c2a72");
    g.addColorStop(1, NAVY);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 12, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 14, h / 2 - 34);
    ctx.lineTo(w / 2 + 24, h / 2 - 12);
    ctx.lineTo(w / 2 - 14, h / 2 + 10);
    ctx.fill();
    pill(ctx, 36, h - 40, w - 72, 8, "rgba(255,255,255,0.25)");
    pill(ctx, 36, h - 40, (w - 72) * 0.42, 8, MARKER);
  });
}

/** Ders hakkı parası: altın zemin, kabartma halka, ortada logonun işareti. */
export function coinFace() {
  return canvas(512, 512, (ctx, w) => {
    const g = ctx.createRadialGradient(w * 0.38, w * 0.32, 20, w / 2, w / 2, w * 0.6);
    g.addColorStop(0, "#ffe7a3");
    g.addColorStop(0.55, "#f4b63a");
    g.addColorStop(1, "#c27d10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = "rgba(120,70,0,0.35)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    const { x, y, width, height } = MARK_VIEWBOX;
    const scale = (w * 0.5) / Math.max(width, height);
    ctx.save();
    ctx.translate(w / 2 - (x + width / 2) * scale, w / 2 - (y + height / 2) * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(110,62,0,0.55)";
    for (const half of Object.values(markParts)) {
      ctx.fill(new Path2D(half.left));
      ctx.fill(new Path2D(half.right));
    }
    ctx.fill(new Path2D(capParts.top));
    ctx.fill(new Path2D(capParts.base));
    ctx.restore();
  });
}

/** Tahtanın camındaki ince nokta ızgarası. */
export function dotGrid() {
  return canvas(1024, 720, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let x = 32; x < w; x += 40)
      for (let y = 32; y < h; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
  });
}
