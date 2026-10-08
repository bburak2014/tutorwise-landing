"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Group,
  type Material,
  type Mesh,
} from "three";
import { brand } from "@/lib/brand.ts";
import { inkProgress, screenReveal, smoothstep } from "../choreography.ts";
import { Device, type DeviceState } from "../Device.tsx";
import { frame } from "../Director.tsx";
import { dissolvable, type Dissolve } from "../dissolve.ts";
import { drawPage, type PageArt } from "../pageArt.ts";
import { story } from "../story.ts";
import { checkBadge, coinFace, dateTile, dotGrid, lessonCard, notification, videoCard } from "./art.ts";
import { BOARD_SIZE, boardLayers, penAt } from "./boardArt.ts";
import { glassy, glossy, overshoot, printed, roundedBox, stagger, useComposition } from "./kit.tsx";

/* Özellik bölümlerinin nesneleri. Her biri gerçek uygulama ekranlı bir
   cihaz ve çevresinde, sahne oturdukça (frame.focus) sırayla gelen
   parçalardan oluşur. Konumlar nesnenin kendi merkezine göre. */

type Vec = [number, number, number];
const lerp3 = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ROYAL = "#0b52bf";

/** Kutunun yalnız ön yüzü (BoxGeometry yüz sırası: +x −x +y −y +z −z) baskılı. */
const faced = (front: Material, rest: Material) => [rest, rest, rest, rest, front, rest];

function useDispose(materials: Material[]) {
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
}

// ── Ders planı ve takvim: tabletten fırlayan ders kartları, takvim yaprağı ──

const calendar = { dissolve: { value: 1 } as Dissolve, device: { reveal: 0 } as DeviceState };
const CARD_AT: Vec[] = [
  [-0.86, 0.56, 0.62],
  [-1.08, 0.12, 0.86],
  [-0.8, -0.34, 0.7],
];

export function Calendar() {
  const root = useComposition("calendar");
  const cards = useRef<(Mesh | null)[]>([]);
  const tile = useRef<Group>(null);
  const materials = useMemo(() => {
    const side = glassy(calendar.dissolve);
    return {
      side,
      cards: [ROYAL, brand.orange, brand.sky].map((c) => faced(printed(lessonCard(c), calendar.dissolve), side)),
      tile: faced(printed(dateTile(18), calendar.dissolve), side),
      ring: glossy("#c9cfe6", calendar.dissolve, { metalness: 0.9, roughness: 0.25 }),
    };
  }, []);
  useDispose(useMemo(() => [materials.side, materials.ring, ...materials.cards.map((m) => m[4]), materials.tile[4]], [materials]));

  useFrame(() => {
    if (!root.current?.visible) return;
    const f = frame.focus[2];
    calendar.device.reveal = screenReveal(f);
    const t = frame.time;
    cards.current.forEach((card, i) => {
      if (!card) return;
      const k = overshoot(stagger(f, i, 4));
      card.position.set(...lerp3([0.1, 0.05, 0.05], CARD_AT[i], k));
      card.position.y += story.reduced ? 0 : Math.sin(t * 0.9 + i * 1.7) * 0.015;
      card.scale.setScalar(0.25 + 0.75 * Math.min(1, k));
    });
    if (tile.current) {
      const k = overshoot(stagger(f, 3, 4));
      tile.current.position.set(...lerp3([0.2, 0.2, 0.05], [1.02, 0.66, 0.42], k));
      tile.current.scale.setScalar(0.25 + 0.75 * Math.min(1, k));
    }
  });

  return (
    <group ref={root} userData={{ dissolve: calendar.dissolve }}>
      <group position={[0.15, 0.05, 0]} rotation={[-0.08, -0.38, 0.02]} scale={1.25}>
        <Device kind="tablet" screen="calendar" dissolve={calendar.dissolve} state={calendar.device} />
      </group>
      {CARD_AT.map((_, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            cards.current[i] = mesh;
          }}
          rotation={[0, 0.32, (i - 1) * 0.03]}
          geometry={roundedBox(0.8, 0.26, 0.03, 0.03)}
          material={materials.cards[i]}
        />
      ))}
      <group ref={tile} rotation={[0.06, -0.3, -0.06]}>
        <mesh geometry={roundedBox(0.42, 0.47, 0.04, 0.04)} material={materials.tile} />
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 0.235, 0.0]} rotation={[0, Math.PI / 2, 0]} material={materials.ring}>
            <torusGeometry args={[0.035, 0.008, 12, 28]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── Canlı ders ve ortak tahta: cam tahtada kendiliğinden çizilen geometri ──

const board = {
  dissolve: { value: 1 } as Dissolve,
  device: { reveal: 0 } as DeviceState,
  progress: { value: 0 },
  since: null as number | null,
};
const DRAW_MS = 3200;
const PANE = { w: 1.6, h: (1.6 * BOARD_SIZE.height) / BOARD_SIZE.width };

function inkMaterial(dissolve: Dissolve, progress: { value: number }) {
  const layers = boardLayers();
  const map = new CanvasTexture(layers.ink);
  map.colorSpace = SRGBColorSpace;
  const time = new CanvasTexture(layers.time);
  const material = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
  material.userData.textures = [time];
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uInkTime = { value: time };
    shader.uniforms.uProgress = progress;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uInkTime;\nuniform float uProgress;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float inkAt = texture2D(uInkTime, vMapUv).r;
        diffuseColor.a *= smoothstep(inkAt, inkAt + 0.012, uProgress * 1.012);`,
      );
  };
  return dissolvable(material, dissolve);
}

export function Board() {
  const root = useComposition("board");
  const pen = useRef<Group>(null);
  const materials = useMemo(() => {
    const grid = new CanvasTexture(dotGrid());
    return {
      pane: glassy(board.dissolve, { color: "#9fb2ff", transparent: true, opacity: 0.07, roughness: 0.04, depthWrite: false }),
      grid: dissolvable(new MeshBasicMaterial({ map: grid, transparent: true, depthWrite: false }), board.dissolve),
      ink: inkMaterial(board.dissolve, board.progress),
      body: glossy(ROYAL, board.dissolve),
      grip: glossy(brand.orange, board.dissolve),
      tip: glossy("#d7dbea", board.dissolve, { metalness: 0.9, roughness: 0.2 }),
    };
  }, []);
  useDispose(useMemo(() => Object.values(materials), [materials]));
  const plane = useMemo(() => new PlaneGeometry(PANE.w, PANE.h), []);
  useEffect(() => () => plane.dispose(), [plane]);

  useFrame(() => {
    if (!root.current?.visible) return;
    const f = frame.focus[3];
    board.device.reveal = screenReveal(f);
    const now = performance.now();
    if (f < 0.4) board.since = null;
    else if (board.since === null && f > 0.95) {
      board.since = now;
      story.busyUntil = Math.max(story.busyUntil, now + DRAW_MS);
    }
    const progress = story.reduced || story.poster ? 1 : inkProgress(now, board.since, DRAW_MS);
    board.progress.value = progress;
    if (pen.current) {
      const { point, drawing } = penAt(progress);
      const done = progress >= 1;
      pen.current.visible = !story.reduced && board.since !== null;
      pen.current.position.set(
        (point[0] / BOARD_SIZE.width - 0.5) * PANE.w,
        (0.5 - point[1] / BOARD_SIZE.height) * PANE.h,
        drawing && !done ? 0.012 : 0.09,
      );
    }
  });

  return (
    <group ref={root} userData={{ dissolve: board.dissolve }}>
      <group position={[0.62, 0.18, -0.45]} rotation={[-0.06, -0.36, 0]} scale={1.1}>
        <Device kind="tablet" screen="board" dissolve={board.dissolve} state={board.device} />
      </group>
      <group position={[-0.42, -0.12, 0.45]} rotation={[0, 0.3, 0]}>
        <mesh geometry={roundedBox(PANE.w + 0.03, PANE.h + 0.03, 0.014, 0.03)} material={materials.pane} userData={{ noSample: true }} />
        <mesh geometry={plane} position-z={0.009} material={materials.grid} userData={{ noSample: true }} />
        <mesh geometry={plane} position-z={0.011} material={materials.ink} />
        <group ref={pen}>
          {/* Kalemin ucu grubun orijininde; gövde yukarı ve kameraya doğru eğik. */}
          <group rotation={[0.75, 0, -0.55]}>
            <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]} material={materials.tip}>
              <coneGeometry args={[0.02, 0.06, 20]} />
            </mesh>
            <mesh position={[0, 0.25, 0]} material={materials.body}>
              <cylinderGeometry args={[0.022, 0.022, 0.38, 24]} />
            </mesh>
            <mesh position={[0, 0.11, 0]} material={materials.grip}>
              <cylinderGeometry args={[0.024, 0.024, 0.07, 24]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// ── Ödev, PDF ve video: telefonun arkasında yelpazelenen sayfalar, video, onaylar ──

const homework = { dissolve: { value: 1 } as Dissolve, device: { reveal: 0 } as DeviceState };
const SHEETS: { art: PageArt; at: Vec; rot: Vec }[] = [
  { art: "assignment", at: [-0.82, 0.14, -0.22], rot: [0, 0.22, 0.16] },
  { art: "pdf", at: [-0.38, 0.22, -0.4], rot: [0, 0.08, 0.05] },
  { art: "checklist", at: [0.55, 0.12, -0.32], rot: [0, -0.22, -0.13] },
];
const BADGES: Vec[] = [
  [-0.9, -0.42, 0.6],
  [-0.62, -0.66, 0.72],
  [-0.32, -0.52, 0.82],
];

export function Homework() {
  const root = useComposition("homework");
  const sheets = useRef<(Mesh | null)[]>([]);
  const video = useRef<Mesh>(null);
  const badges = useRef<(Mesh | null)[]>([]);
  const materials = useMemo(() => {
    const side = glassy(homework.dissolve);
    const sheetSide = glassy(homework.dissolve, { color: "#e9e3d5", clearcoat: 0, roughness: 0.9 });
    return {
      side,
      sheetSide,
      sheets: SHEETS.map(({ art }) =>
        faced(printed(drawPage(art, "left", 448), homework.dissolve, 0.85), sheetSide),
      ),
      video: faced(printed(videoCard(), homework.dissolve, 0.3), glossy("#141c4d", homework.dissolve)),
      badge: faced(printed(checkBadge(), homework.dissolve, 0.3), glossy(ROYAL, homework.dissolve)),
    };
  }, []);
  useDispose(
    useMemo(
      () => [materials.side, materials.sheetSide, ...materials.sheets.map((m) => m[4]), materials.video[4], materials.video[0], materials.badge[4], materials.badge[0]],
      [materials],
    ),
  );

  useFrame(() => {
    if (!root.current?.visible) return;
    const f = frame.focus[4];
    homework.device.reveal = screenReveal(f);
    sheets.current.forEach((sheet, i) => {
      if (!sheet) return;
      const k = stagger(f, i, 5);
      const { at, rot } = SHEETS[i];
      sheet.position.set(...lerp3([0, 0.02, -0.45], at, k));
      sheet.rotation.set(rot[0] * k, rot[1] * k, rot[2] * k);
    });
    if (video.current) {
      const k = overshoot(stagger(f, 3, 5));
      video.current.position.set(...lerp3([0.1, -0.1, 0.1], [0.66, -0.46, 0.56], k));
      video.current.scale.setScalar(0.3 + 0.7 * Math.min(1, k));
    }
    badges.current.forEach((badge, i) => {
      if (!badge) return;
      const k = overshoot(stagger(f, 2 + i, 6));
      badge.scale.setScalar(Math.max(0.001, k));
    });
  });

  return (
    <group ref={root} userData={{ dissolve: homework.dissolve }}>
      {SHEETS.map(({ art }, i) => (
        <mesh
          key={art}
          ref={(mesh) => {
            sheets.current[i] = mesh;
          }}
          geometry={roundedBox(0.78, 1.04, 0.008, 0.008)}
          material={materials.sheets[i]}
        />
      ))}
      <group position={[0.06, 0, 0.25]} rotation={[0, -0.25, 0.02]} scale={1.45}>
        <Device kind="phone" screen="homework" dissolve={homework.dissolve} state={homework.device} />
      </group>
      <mesh ref={video} rotation={[0, -0.34, 0]} geometry={roundedBox(0.84, 0.47, 0.03, 0.035)} material={materials.video} />
      {BADGES.map((at, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            badges.current[i] = mesh;
          }}
          position={at}
          rotation={[0, 0.2, 0]}
          geometry={roundedBox(0.2, 0.2, 0.035, 0.1)}
          material={materials.badge}
        />
      ))}
    </group>
  );
}

// ── Paketler ve tahsilat: üst üste düşen ders hakkı paraları, dolan halka ──

const credits = { dissolve: { value: 1 } as Dissolve, device: { reveal: 0 } as DeviceState };
const COINS = 6;
const RING = { tubular: 128, radial: 12 };

function arcTube(from: number, to: number) {
  const points = Array.from({ length: 65 }, (_, i) => {
    const a = Math.PI / 2 - (from + ((to - from) * i) / 64) * Math.PI * 2;
    return new Vector3(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0);
  });
  return new TubeGeometry(new CatmullRomCurve3(points), RING.tubular, 0.034, RING.radial, false);
}

export function Credits() {
  const root = useComposition("credits");
  const coins = useRef<(Mesh | null)[]>([]);
  const filled = useRef<Mesh>(null);
  const extra = useRef<Mesh>(null);
  const materials = useMemo(
    () => ({
      gold: glossy("#e9a62c", credits.dissolve, { metalness: 0.85, roughness: 0.3, emissiveIntensity: 0.04 }),
      face: printed(coinFace(), credits.dissolve, 0.35),
      track: glassy(credits.dissolve, { color: "#2a3570", roughness: 0.5, clearcoat: 0.4 }),
      royal: glossy(ROYAL, credits.dissolve, { emissiveIntensity: 0.25 }),
      orange: glossy(brand.orange, credits.dissolve, { emissiveIntensity: 0.25 }),
    }),
    [],
  );
  useDispose(useMemo(() => Object.values(materials), [materials]));
  const geometry = useMemo(
    () => ({
      coin: new CylinderGeometry(0.2, 0.2, 0.045, 64),
      track: new TorusGeometry(0.36, 0.03, 12, 96),
      filled: arcTube(0, 0.72),
      extra: arcTube(0.72, 0.86),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);

  useFrame(() => {
    if (!root.current?.visible) return;
    const f = frame.focus[5];
    credits.device.reveal = screenReveal(f);
    coins.current.forEach((coin, i) => {
      if (!coin) return;
      const k = overshoot(stagger(f, i, COINS + 2, 0.4));
      coin.position.set(0.5, -0.62 + i * 0.048 + (1 - Math.min(1, k)) * 1.3, 0.5);
      coin.rotation.set(0, i * 0.7 + (1 - k) * 2, 0);
      coin.visible = k > 0.001;
    });
    const ring = smoothstep(0.2, 1, f);
    const segments = RING.radial * 6;
    filled.current?.geometry.setDrawRange(0, Math.floor(smoothstep(0, 0.8, ring) * RING.tubular) * segments);
    extra.current?.geometry.setDrawRange(0, Math.floor(smoothstep(0.8, 1, ring) * RING.tubular) * segments);
  });

  return (
    <group ref={root} userData={{ dissolve: credits.dissolve }}>
      <group position={[-0.5, 0.18, -0.3]} rotation={[-0.05, -0.4, 0]} scale={1.1}>
        <Device kind="tablet" screen="packages" dissolve={credits.dissolve} state={credits.device} />
      </group>
      {Array.from({ length: COINS }, (_, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            coins.current[i] = mesh;
          }}
          geometry={geometry.coin}
          material={[materials.gold, materials.face, materials.gold]}
        />
      ))}
      <group position={[0.62, 0.52, 0.42]} rotation={[0, -0.3, 0]}>
        <mesh geometry={geometry.track} material={materials.track} />
        <mesh ref={filled} geometry={geometry.filled} material={materials.royal} />
        <mesh ref={extra} geometry={geometry.extra} material={materials.orange} />
      </group>
    </group>
  );
}

// ── Veli ve haftalık özet: yükselen grafik, bildirim baloncukları ──

const summary = { dissolve: { value: 1 } as Dissolve, device: { reveal: 0 } as DeviceState };
const BARS = [0.45, 0.7, 0.35, 0.9, 0.6, 0.78, 0.5];

export function Summary() {
  const root = useComposition("summary");
  const bars = useRef<(Mesh | null)[]>([]);
  const bubbles = useRef<(Mesh | null)[]>([]);
  const materials = useMemo(() => {
    const side = glassy(summary.dissolve);
    return {
      side,
      base: glassy(summary.dissolve, { transparent: true, opacity: 0.5 }),
      bar: glossy(ROYAL, summary.dissolve),
      peak: glossy(brand.orange, summary.dissolve),
      bubbles: [ROYAL, brand.orange, brand.sky].map((c) => faced(printed(notification(c), summary.dissolve), side)),
    };
  }, []);
  useDispose(useMemo(() => [materials.side, materials.base, materials.bar, materials.peak, ...materials.bubbles.map((m) => m[4])], [materials]));

  useFrame(() => {
    if (!root.current?.visible) return;
    const f = frame.focus[6];
    summary.device.reveal = screenReveal(f);
    bars.current.forEach((bar, i) => {
      if (!bar) return;
      const h = Math.max(0.001, BARS[i] * 0.95 * stagger(f, i, BARS.length + 2));
      bar.scale.y = h;
      bar.position.y = h / 2 + 0.02;
    });
    bubbles.current.forEach((bubble, i) => {
      if (!bubble) return;
      const k = overshoot(stagger(f, i + 1, 5));
      bubble.position.set(...lerp3([-0.5, 0.1, 0.2], [0.32, 0.86 - i * 0.26, 0.55 + i * 0.05], k));
      bubble.scale.setScalar(0.2 + 0.8 * Math.min(1, k));
    });
  });

  return (
    <group ref={root} userData={{ dissolve: summary.dissolve }}>
      <group position={[-0.58, 0, 0.18]} rotation={[0, 0.3, -0.02]} scale={1.4}>
        <Device kind="phone" screen="summary" dissolve={summary.dissolve} state={summary.device} />
      </group>
      <group position={[0.42, -0.66, 0.25]} rotation={[0.12, -0.28, 0]}>
        <mesh geometry={roundedBox(1.3, 0.04, 0.42, 0.02)} material={materials.base} />
        {BARS.map((_, i) => (
          <mesh
            key={i}
            ref={(mesh) => {
              bars.current[i] = mesh;
            }}
            position={[-0.5 + i * (1 / 6), 0, 0]}
            geometry={roundedBox(0.12, 1, 0.12, 0.03)}
            material={i === 3 ? materials.peak : materials.bar}
          />
        ))}
      </group>
      {materials.bubbles.map((material, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            bubbles.current[i] = mesh;
          }}
          rotation={[0, -0.2, 0]}
          geometry={roundedBox(0.66, 0.19, 0.035, 0.09)}
          material={material}
        />
      ))}
    </group>
  );
}
