/* Canlı ders tahtası: camın üstünde kalemle çizilen bir geometri çizimi.
   Çizgiler bir liste olarak tutulur; aynı listeden (1) mürekkep, (2) her
   noktanın ne zaman çizileceğini gösteren zaman haritası (kırmızı kanal,
   yol uzunluğuna göre) ve (3) kalemin ucunun yolu üretilir. Böylece kalem
   ucu çizginin tam başında durur. Tuval 1024×720. */
import { brand } from "@/lib/brand.ts";

type Point = [number, number];
type Stroke = { points: Point[]; width: number; color: string; dash?: number[] };

const W = 1024;
const H = 720;

function arc(cx: number, cy: number, r: number, from: number, to: number, steps: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

function wave(from: Point, to: Point, steps: number, amplitude: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI * 2) * amplitude];
  });
}

const A: Point = [200, 520];
const B: Point = [760, 520];
const C: Point = [400, 170];

/** Çizim sırası: üçgen, yükseklik, açı yayı, çember, altını çizen fosforlu kalem. */
export const strokes: Stroke[] = [
  { points: [A, B, C, A], width: 9, color: "#ffffff" },
  { points: [C, [400, 520]], width: 6, color: brand.sky, dash: [18, 14] },
  { points: arc(A[0], A[1], 74, -0.98, 0, 16), width: 6, color: brand.sky },
  { points: arc(790, 236, 84, -Math.PI / 2, Math.PI * 1.5, 48), width: 7, color: "#ffffff" },
  { points: wave([230, 616], [740, 604], 24, 6), width: 26, color: "rgba(253,171,32,0.85)" },
];

const distance = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Kalemin bütün yolu: her noktanın 0–1 arası çizilme anıyla. Çizgiler arası
 *  kalem kalkıp kısa yoldan geçer (o mesafe çizgiden hızlı geçilir). */
export const penPath: { point: Point; at: number; drawing: boolean }[] = (() => {
  const raw: { point: Point; length: number; drawing: boolean }[] = [];
  let total = 0;
  let last: Point | null = null;
  for (const stroke of strokes) {
    stroke.points.forEach((point, i) => {
      if (last) total += distance(last, point) * (i === 0 ? 0.25 : 1);
      raw.push({ point, length: total, drawing: i > 0 });
      last = point;
    });
  }
  return raw.map(({ point, length, drawing }) => ({ point, at: length / total, drawing }));
})();

/** İlerlemede (0–1) kalemin ucunun konumu (tuval koordinatı) ve çizip çizmediği. */
export function penAt(progress: number): { point: Point; drawing: boolean } {
  const p = Math.min(1, Math.max(0, progress));
  for (let i = 1; i < penPath.length; i++) {
    const a = penPath[i - 1];
    const b = penPath[i];
    if (p > b.at) continue;
    const t = b.at === a.at ? 1 : (p - a.at) / (b.at - a.at);
    return {
      point: [a.point[0] + (b.point[0] - a.point[0]) * t, a.point[1] + (b.point[1] - a.point[1]) * t],
      drawing: b.drawing,
    };
  }
  return { point: penPath.at(-1)?.point ?? [0, 0], drawing: false };
}

function canvas(scale = 1) {
  const el = document.createElement("canvas");
  el.width = W * scale;
  el.height = H * scale;
  return el;
}

/** Mürekkep (saydam zemin) ve zaman haritası (yarım çözünürlük). */
export function boardLayers() {
  const ink = canvas();
  const time = canvas(0.5);
  const inkCtx = ink.getContext("2d");
  const timeCtx = time.getContext("2d");
  if (!inkCtx || !timeCtx) return { ink, time };
  for (const ctx of [inkCtx, timeCtx]) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }
  for (const stroke of strokes) {
    inkCtx.strokeStyle = stroke.color;
    inkCtx.lineWidth = stroke.width;
    inkCtx.setLineDash(stroke.dash ?? []);
    inkCtx.beginPath();
    inkCtx.moveTo(...stroke.points[0]);
    for (const point of stroke.points.slice(1)) inkCtx.lineTo(...point);
    inkCtx.stroke();
  }
  // Zaman haritası: zemin en son an (1); her parça kendi anının tonunda.
  // Sondan başa çizilir: üst üste binen yerde (üçgenin kapandığı köşe) en
  // erken an kazanır, kalemin önünde boşluk kalmaz.
  timeCtx.fillStyle = "rgb(255,0,0)";
  timeCtx.fillRect(0, 0, time.width, time.height);
  timeCtx.scale(0.5, 0.5);
  for (let i = penPath.length - 1; i >= 1; i--) {
    const a = penPath[i - 1];
    const b = penPath[i];
    if (!b.drawing) continue;
    const width = strokes.find((s) => s.points.includes(b.point))?.width ?? 8;
    const pieces = Math.max(1, Math.ceil(distance(a.point, b.point) / 6));
    for (let k = pieces - 1; k >= 0; k--) {
      const t0 = k / pieces;
      const t1 = (k + 1) / pieces;
      const at = a.at + (b.at - a.at) * t1;
      timeCtx.strokeStyle = `rgb(${Math.min(255, Math.round(at * 254) + 1)},0,0)`;
      timeCtx.lineWidth = width + 4;
      timeCtx.beginPath();
      timeCtx.moveTo(a.point[0] + (b.point[0] - a.point[0]) * t0, a.point[1] + (b.point[1] - a.point[1]) * t0);
      timeCtx.lineTo(a.point[0] + (b.point[0] - a.point[0]) * t1, a.point[1] + (b.point[1] - a.point[1]) * t1);
      timeCtx.stroke();
    }
  }
  return { ink, time };
}

export const BOARD_SIZE = { width: W, height: H };
