/* 3D hikâyenin saf hesapları: kaydırma → "beat", beat → kitap pozu, sayfa
   dönüşü ve cihaz yükselişi. React ve three.js'e bağlı değil; test edilir.

   Beat: sayfadaki her sahnenin (data-scene) sırası. Bir sahnenin üst kenarı
   görünüm alanının ortasına geldiğinde beat o sahnenin sırasıdır; bir
   sonrakinin üst kenarı ortaya gelene kadar kesirli olarak artar. Sahnenin
   metni ekranda ortalandığında beat ≈ sıra + 0.5 ("okuma anı"). */

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

export type Pose = {
  /** Kitabın konumu, dönüşü (radyan) ve ölçeği. */
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  /** Ön kapağın açıklığı: 0 kapalı, 1 tamamen açık. */
  cover: number;
  /** Dönmüş sayfa sayısı (kesirli: dönmekte olan sayfa). */
  flip: number;
  /** Sayfaların yelpaze gibi açılması. */
  fan: number;
  /** Kitabın parlaklığı / öne çıkması (geri çekilince azalır). */
  glow: number;
  /** "Her yerde" sahnesinde telefon ve tabletin iki yanda görünmesi. */
  pair: number;
};

export type ScreenId = "calendar" | "board" | "homework" | "packages" | "summary";
export type DeviceKind = "tablet" | "phone";

const pose = (p: Partial<Pose>): Pose => ({
  x: 0,
  y: 0,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  scale: 1,
  cover: 1,
  flip: 0,
  fan: 0,
  glow: 1,
  pair: 0,
  ...p,
});

const chapter = (flip: number, ry: number): Pose =>
  pose({ x: 1.72, y: -0.58, rx: -0.98, ry, rz: 0.02, scale: 0.92, flip });

const chapterNarrow = (flip: number): Pose =>
  pose({ y: 1.12, rx: -0.9, scale: 0.5, flip });

/** Her sahnenin kitap pozu; sıra `scenes` ile aynı. Geniş ekranda metin
 *  soldadır, kitap sağda; ortalanmış metinli sahnelerde kitap kenara çekilir. */
export const keys: Record<Layout, Pose[]> = {
  wide: [
    // Açılış: kapalı kitap, sırtı (sarı şerit) kameraya dönük.
    pose({ x: 1.55, y: -0.1, rx: 0.3, ry: 0.5, rz: 0.1, scale: 1.05, cover: 0 }),
    // Biz kimiz: kapak açılır.
    pose({ x: 1.62, y: -0.2, z: 0.25, rx: -0.5, ry: -0.2, rz: 0.04 }),
    chapter(1, -0.12),
    chapter(2, -0.18),
    chapter(3, -0.1),
    chapter(4, -0.2),
    chapter(5, -0.12),
    // Kimler için: sağ üstte, sayfalar yelpaze; kartlar camın arkasından görür.
    pose({ x: 2.35, y: 0.85, z: -2.4, rx: -0.5, ry: -0.35, scale: 0.95, flip: 5, fan: 1, glow: 0.6 }),
    // Her yerde: kitap sağdan çıkar, sahneyi cihazlar taşır.
    pose({ x: 7.5, y: 0.6, z: -3.2, rx: -0.6, ry: -0.6, scale: 0.9, flip: 5, fan: 0.4, glow: 0.4, pair: 1 }),
    // Kapanış: kitap kapanıp sağdan geri gelir, açılış pozuna benzer.
    pose({ x: 2.7, y: -0.05, z: -0.6, rx: 0.3, ry: 0.5, rz: 0.08, scale: 0.78, cover: 0 }),
  ],
  narrow: [
    pose({ x: 0.15, y: 1.05, rx: 0.3, ry: 0.5, rz: 0.1, scale: 0.6, cover: 0 }),
    pose({ y: 1.1, rx: -0.55, ry: -0.15, scale: 0.52 }),
    chapterNarrow(1),
    chapterNarrow(2),
    chapterNarrow(3),
    chapterNarrow(4),
    chapterNarrow(5),
    pose({ y: 1.25, z: -2, rx: -0.55, scale: 0.6, flip: 5, fan: 1, glow: 0.55 }),
    pose({ x: 2.6, y: 1.25, z: -2.6, rx: -0.6, ry: -0.6, scale: 0.6, flip: 5, fan: 0.4, glow: 0.4, pair: 1 }),
    pose({ y: 1.15, z: -1, rx: 0.3, ry: 0.5, rz: 0.08, scale: 0.48, cover: 0 }),
  ],
};

/** Her özellik bölümünde sayfadan yükselen cihaz ve ekranı. */
const devices: Partial<Record<Scene, { screen: ScreenId; kind: DeviceKind }>> = {
  "chapter-plan": { screen: "calendar", kind: "tablet" },
  "chapter-live": { screen: "board", kind: "tablet" },
  "chapter-homework": { screen: "homework", kind: "phone" },
  "chapter-packages": { screen: "packages", kind: "tablet" },
  "chapter-family": { screen: "summary", kind: "phone" },
};

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

/** Sıradaki sayfanın dönüş oranı: sayfalar birbiri ardına döner. */
export function pageTurn(flip: number, index: number) {
  return clamp01(flip - index);
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const key of Object.keys(a) as (keyof Pose)[]) out[key] = a[key] + (b[key] - a[key]) * t;
  return out;
}

/** Beat'teki kitap pozu. Her sahnenin pozu okuma anının çevresinde sabit
 *  durur; iki okuma anı arasındaki ortada yumuşakça bir sonrakine geçer. */
export function poseAt(beat: number, layout: Layout): Pose {
  const list = keys[layout];
  const u = beat - 0.5;
  if (u <= 0) return list[0];
  if (u >= list.length - 1) return list[list.length - 1];
  const k = Math.floor(u);
  const t = smoothstep(0.2, 0.8, u - k);
  if (t === 0) return list[k];
  if (t === 1) return list[k + 1];
  return lerpPose(list[k], list[k + 1], t);
}

/** Beat'teki cihaz: en yakın sahne bir özellik bölümüyse onun ekranı. Cihaz
 *  okuma anında tamamen yükselir, iki bölüm arasında sayfaya iner; ekran
 *  değişimi cihaz görünmezken olur. */
export function deviceAt(beat: number): { screen: ScreenId | null; kind: DeviceKind; rise: number } {
  const u = beat - 0.5;
  const n = Math.min(scenes.length - 1, Math.max(0, Math.round(u)));
  const spec = devices[scenes[n]];
  if (!spec) return { screen: null, kind: "tablet", rise: 0 };
  return { ...spec, rise: 1 - smoothstep(0.2, 0.45, Math.abs(u - n)) };
}

/** Sinematik açılış: kitap derinlikten (geride, aşağıda, dönük, küçük) gelir
 *  ve pozuna oturur; sırt ışığı başta kapalıdır. t: 0 → 1 (GSAP sürer). */
export function introPose(target: Pose, t: number): Pose {
  const e = 1 - Math.pow(1 - clamp01(t), 4);
  const from: Pose = {
    ...target,
    z: target.z - 6,
    y: target.y - 0.6,
    ry: target.ry - 1.1,
    rx: target.rx + 0.5,
    scale: target.scale * 0.7,
    glow: 0,
  };
  if (e >= 1) return target;
  return lerpPose(from, target, e);
}

/** Sırt ışığının açılıştaki yanışı: kapalı, iki kısa titreme, sonra açık. */
export function spineGlow(t: number) {
  const x = clamp01(t);
  if (x < 0.42) return 0;
  if (x < 0.47) return 0.65;
  if (x < 0.52) return 0.15;
  if (x < 0.56) return 0.9;
  if (x < 0.6) return 0.35;
  return smoothstep(0.6, 0.85, x) * 0.65 + 0.35;
}

/** Sabitlenmiş "kitap okuma" bölümünde gösterilen özellik: kaydırma
 *  ilerlemesi (0–1) iki özelliğin tam ortasından geçince değişir. */
export function chapterIndex(progress: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.floor(progress * (count - 1) + 0.5)));
}

/** Kaydırmanın tek adımda bir sahneden fazla atlaması (bağlantı, End tuşu,
 *  kaydırma çubuğu) bir kesmedir: 3D aradaki sahneleri hızla oynatmaz,
 *  doğrudan yeni sahneye geçer. Komşu sahneye geçiş kesme sayılmaz. */
export function isCut(previous: number, next: number) {
  return Math.abs(next - previous) > 1.2;
}
