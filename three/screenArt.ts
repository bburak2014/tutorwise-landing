/* Cihaz ekranları için geçici görseller. Gerçek uygulama ekran görüntüleri
   (public/screens/<dil>/<ekran>.webp) gelene kadar uygulamanın düzenini
   andıran bir çerçeve (lacivert kenar menü, açık içerik alanı) çizilir. */
import type { DeviceKind, ScreenId } from "./choreography.ts";
import { drawPage, type PageArt } from "./pageArt.ts";

const ART: Record<ScreenId, PageArt> = {
  calendar: "agenda",
  board: "sketch",
  homework: "checklist",
  packages: "payments",
  summary: "summary",
};

export const SCREEN_SIZE: Record<DeviceKind, [number, number]> = {
  tablet: [1180, 820],
  phone: [390, 844],
};

export function drawScreen(id: ScreenId, kind: DeviceKind, scale: number): HTMLCanvasElement {
  const [w0, h0] = SCREEN_SIZE[kind];
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const s = scale;
  ctx.fillStyle = "#f5f6fa";
  ctx.fillRect(0, 0, width, height);

  let left = 0;
  let top = 0;
  if (kind === "tablet") {
    left = 220 * s;
    ctx.fillStyle = "#141c4d";
    ctx.fillRect(0, 0, left, height);
    for (let i = 0; i < 7; i++) {
      const y = (90 + i * 54) * s;
      const active = i === Object.keys(ART).indexOf(id);
      if (active) {
        ctx.fillStyle = "#ffd84a";
        ctx.beginPath();
        ctx.roundRect(16 * s, y - 14 * s, left - 32 * s, 40 * s, 10 * s);
        ctx.fill();
      }
      ctx.fillStyle = active ? "#2a2100" : "rgba(195,201,236,0.6)";
      ctx.beginPath();
      ctx.roundRect(32 * s, y, (90 + ((i * 23) % 50)) * s, 10 * s, 5 * s);
      ctx.fill();
    }
  } else {
    top = 110 * s;
    ctx.fillStyle = "#141c4d";
    ctx.fillRect(0, 0, width, top);
    ctx.fillStyle = "#ffd84a";
    ctx.beginPath();
    ctx.roundRect(24 * s, top - 46 * s, 120 * s, 12 * s, 6 * s);
    ctx.fill();
  }

  const page = drawPage(ART[id], "left", Math.round((width - left) * 1.0));
  ctx.fillStyle = "#ffffff";
  const pad = 16 * s;
  ctx.beginPath();
  ctx.roundRect(left + pad, top + pad, width - left - pad * 2, height - top - pad * 2, 16 * s);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(left + pad, top + pad, width - left - pad * 2, height - top - pad * 2, 16 * s);
  ctx.clip();
  ctx.drawImage(page, left + pad, top + pad, width - left - pad * 2, (width - left - pad * 2) * (page.height / page.width));
  ctx.restore();
  return canvas;
}
