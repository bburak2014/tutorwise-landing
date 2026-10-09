/* 3D hikâyenin saf hesapları: kaydırma → "beat", beat → hangi sahnenin
   nesnesi görünüyor, iki nesne arasındaki parçacık geçişi, kamera. React ve
   three.js'e bağlı değil; test edilir.

   Beat: sayfadaki her sahnenin (data-scene) sırası. Bir sahnenin üst kenarı
   görünüm alanının ortasına geldiğinde beat o sahnenin sırasıdır; bir
   sonrakinin üst kenarı ortaya gelene kadar kesirli olarak artar. Sahnenin
   metni ekranda ortalandığında beat ≈ sıra + 0.5 ("okuma anı"). */

import type { CameraMove } from "./camera.ts";

export const scenes = [
  "hero",
  "about",
  "chapter-plan",
  "chapter-live",
  "chapter-homework",
  "chapter-packages",
  "chapter-family",
  "audiences",
  "everywhere",
  "final",
] as const;
export type Scene = (typeof scenes)[number];
export type Layout = "wide" | "narrow";

/** Sahnelerin nesneleri. Açılış ve kapanış dizüstü bilgisayar ve çevresinde
 *  dönen ders nesneleridir; Biz kimiz açılan kitaptır; her özellik kendi
 *  nesnesine dönüşür. 3D logo yoktur. */
export const compositions = [
  "hero",
  "book",
  "calendar",
  "board",
  "homework",
  "credits",
  "summary",
  "roles",
  "devices",
] as const;
export type Composition = (typeof compositions)[number];
export const sceneComposition: Composition[] = [
  "hero",
  "book",
  "calendar",
  "board",
  "homework",
  "credits",
  "summary",
  "roles",
  "devices",
  "hero",
];

export type ScreenId = "calendar" | "board" | "homework" | "packages" | "summary";
export type DeviceKind = "tablet" | "phone";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Görünüm alanının ortasının sayfadaki konumundan beat. `tops`: sahnelerin
 *  üst kenarları (artan), `lastBottom`: son sahnenin alt kenarı. Sahnesiz bir
 *  ara blok, kendinden önceki sahneye sayılır. */
export function beatFromScroll(center: number, tops: readonly number[], lastBottom: number) {
  if (tops.length === 0 || center <= tops[0]) return 0;
  for (let i = tops.length - 1; i >= 0; i--) {
    if (center < tops[i]) continue;
    const end = i + 1 < tops.length ? tops[i + 1] : lastBottom;
    return i + clamp01((center - tops[i]) / Math.max(1, end - tops[i]));
  }
  return 0;
}

/** Beat'te sahne: `from` ile `to` (= from + 1) arasındaki geçişin ilerlemesi
 *  `t` (0: from, 1: to). Her sahne okuma anının çevresinde sabit kalır;
 *  geçiş iki okuma anının ortasında olur. */
export function stageAt(beat: number) {
  const last = scenes.length - 1;
  const u = Math.min(last, Math.max(0, beat - 0.5));
  const from = Math.min(last - 1, Math.floor(u));
  return { from, to: from + 1, t: smoothstep(0.2, 0.8, u - from) };
}

/** Nesnelerin görünürlüğü (0–1). Geçişte çıkan nesne ilk %40'ta solar,
 *  gelen son %40'ta belirir. Aynı nesne iki sahnede de varsa (açılış → Biz
 *  kimiz) hiç solmaz. */
export function presence(beat: number): Record<Composition, number> {
  const { from, to, t } = stageAt(beat);
  const out = Object.fromEntries(compositions.map((c) => [c, 0])) as Record<Composition, number>;
  const a = sceneComposition[from];
  const b = sceneComposition[to];
  if (a === b) {
    out[a] = 1;
    return out;
  }
  out[a] = 1 - smoothstep(0, 0.4, t);
  out[b] = smoothstep(0.6, 1, t);
  return out;
}

/** Beat'in sahnesi (okuma anına en yakın sahne). */
export function sceneOf(beat: number) {
  return Math.min(scenes.length - 1, Math.max(0, Math.round(beat - 0.5)));
}

/** Doğrudan geçiş (bağlantı, End tuşu, hızlı kaydırma): aradaki sahnelerin
 *  nesneleri hiç görünmez; eski nesne solar, yenisi belirir. k: 0–1. */
export function jumpPresence(fromBeat: number, toBeat: number, k: number): Record<Composition, number> {
  const out = Object.fromEntries(compositions.map((c) => [c, 0])) as Record<Composition, number>;
  const a = sceneComposition[sceneOf(fromBeat)];
  const b = sceneComposition[sceneOf(toBeat)];
  if (a === b) {
    out[a] = 1;
    return out;
  }
  out[a] = 1 - smoothstep(0, 0.5, k);
  out[b] = smoothstep(0.45, 1, k);
  return out;
}

/** Sahnenin oturma oranı: okuma anında 1, iki sahnenin ortasına doğru 0.
 *  Nesnelerin iç hareketleri (tabletten fırlayan kartlar…) bunu izler. */
export function focusAt(beat: number, scene: number) {
  return 1 - smoothstep(0.2, 0.45, Math.abs(beat - 0.5 - scene));
}

const cam = (dolly: number, orbit: number, tilt = 0.04): CameraMove => ({ dolly, orbit, tilt });

/** Her sahnede kameranın nesneye yaklaşması ve çevresinde dönmesi. Nesne
 *  ekranda aynı yerde kalır (camera.ts); "Her yerde" sahnesinde kamera durur. */
export const cameraKeys: Record<Layout, CameraMove[]> = {
  wide: [
    cam(1, 0, 0.02),
    cam(0.92, 0.24),
    cam(0.9, 0.16),
    cam(0.88, -0.14),
    cam(0.9, 0.18),
    cam(0.9, -0.12),
    cam(0.9, 0.14),
    cam(0.98, -0.06),
    cam(1, 0, 0),
    cam(0.96, -0.1),
  ],
  narrow: [
    cam(1, 0, 0),
    cam(0.96, 0.12),
    cam(0.96, 0.08),
    cam(0.95, -0.07),
    cam(0.96, 0.08),
    cam(0.96, -0.06),
    cam(0.96, 0.07),
    cam(1, 0, 0),
    cam(1, 0, 0),
    cam(0.98, -0.05),
  ],
};

export function cameraAt(beat: number, layout: Layout): CameraMove {
  const { from, to, t } = stageAt(beat);
  const a = cameraKeys[layout][from];
  const b = cameraKeys[layout][to];
  if (t === 0) return a;
  if (t === 1) return b;
  return {
    dolly: a.dolly + (b.dolly - a.dolly) * t,
    orbit: a.orbit + (b.orbit - a.orbit) * t,
    tilt: a.tilt + (b.tilt - a.tilt) * t,
  };
}

/** Kaydırmanın tek adımda bir sahneden fazla atlaması (bağlantı, End tuşu,
 *  kaydırma çubuğu) bir kesmedir: 3D aradaki sahneleri hızla oynatmaz,
 *  doğrudan yeni sahneye geçer. Komşu sahneye geçiş kesme sayılmaz. */
export function isCut(previous: number, next: number) {
  return Math.abs(next - previous) > 1.2;
}

/** Sabitlenmiş özellikler bölümünde gösterilen özellik: kaydırma
 *  ilerlemesi (0–1) iki özelliğin tam ortasından geçince değişir. */
export function chapterIndex(progress: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.floor(progress * (count - 1) + 0.5)));
}

/** Bir çizim başladıktan sonraki ilerlemesi (0–1). `since` null ise çizim
 *  henüz başlamadı: hiçbir şey görünmez. */
export function inkProgress(now: number, since: number | null, duration: number) {
  if (since === null) return 0;
  return clamp01((now - since) / duration);
}

/** Cihaz ekranının yukarıdan aşağı satır satır belirmesi (0–1): nesne
 *  oturmaya yaklaşırken başlar, oturunca tamamlanır. */
export function screenReveal(rise: number) {
  return smoothstep(0.35, 0.95, rise);
}

/** Sıradaki sayfanın dönüş oranı: sayfalar birbiri ardına döner. */
export function pageTurn(flip: number, index: number) {
  return clamp01(flip - index);
}

/** Kapak açılırken üstteki üç sayfanın havalanıp geri düşmesi (k = 0 en
 *  üstteki yaprak): kapağı biraz izler, sonra yerine oturur. Açı, radyan;
 *  alttaki yapraklar kımıldamaz. */
export function riffle(cover: number, k: number) {
  if (k > 2) return 0;
  const start = 0.22 + 0.1 * k;
  const t = smoothstep(start, start + 0.55, cover);
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(Math.PI * t) * (0.95 - 0.3 * k);
}

/** Kaydırma durunca sahnenin duracağı beat. Kaydırma iki sahnenin geçişinin
 *  ortasında kaldıysa (nesneler yarı saydam ya da hiç görünmüyor) geçiş,
 *  metnin gösterdiği yani en yakın sahnenin tam göründüğü kenara tamamlanır;
 *  `zone` o geçişin aralığıdır: kaydırma bu aralıkta kaldıkça sahne kenarda
 *  bekler (ScrollDriver). Geçişte değilse beat olduğu gibi kalır. */
export function restingBeat(beat: number): { beat: number; zone: [number, number] | null } {
  const u = beat - 0.5;
  const k = Math.floor(u);
  const f = u - k;
  if (k < 0 || k >= scenes.length - 1 || f <= 0.2 || f >= 0.8) return { beat, zone: null };
  const zone: [number, number] = [round(k + 0.7), round(k + 1.3)];
  // Metin (ChapterStage) ortadan bir piksel önce değişir; sahne de onunla.
  return { beat: f < 0.4995 ? zone[0] : zone[1], zone };
}

const round = (v: number) => Math.round(v * 1000) / 1000;
