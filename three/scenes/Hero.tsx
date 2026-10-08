"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  ConeGeometry,
  Euler,
  ExtrudeGeometry,
  type Group,
  type Material,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { brand } from "@/lib/brand.ts";
import { smoothstep } from "../choreography.ts";
import { Laptop, type LaptopState } from "../Device.tsx";
import { frame } from "../Director.tsx";
import { fading, type Fade } from "../fade.ts";
import { story } from "../story.ts";
import { glassy, glossy, roundedBox, useComposition } from "./kit.tsx";

/* Açılış: dizüstü bilgisayarın kapağı açılır, ekranda uygulamanın canlı ders
   tahtası belirir; ekranın arkasından çıkan ders nesneleri (kitap, kep,
   kalem, gönye, atom) eğik bir yörüngede bilgisayarın çevresinde döner.
   Teknoloji (bilgisayar, canlı tahta) ve eğitim (nesneler) bir arada. Işık
   efekti, parçacık ya da baloncuk yok. */

const hero = {
  fade: { value: 1 } as Fade,
  laptop: { open: 0, reveal: 0 } as LaptopState,
};

/** Yörünge: bilgisayarın biraz üstünde, öne eğik bir elips. */
const ORBIT = {
  center: new Vector3(0, 0.2, 0),
  rx: 1.4,
  rz: 1.24,
  tilt: new Euler(1.16, 0, -0.2),
};
const SPIN = 0.12; // rad/sn: bir tur ~50 sn
const OBJECTS = 5;

/** n'inci nesnenin yörüngedeki yeri (açı θ). */
export function orbitPoint(theta: number, spread = 1, out = new Vector3()) {
  return out
    .set(Math.cos(theta) * ORBIT.rx * spread, 0, Math.sin(theta) * ORBIT.rz * spread)
    .applyEuler(ORBIT.tilt)
    .add(ORBIT.center);
}

function stripes(vertical: boolean) {
  const el = document.createElement("canvas");
  el.width = 256;
  el.height = 256;
  const ctx = el.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#f3ecdc";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "rgba(120, 100, 70, 0.16)";
    for (let i = 0; i < 256; i += 6) {
      if (vertical) ctx.fillRect(i, 0, 2, 256);
      else ctx.fillRect(0, i, 256, 2);
    }
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Kitap kapağı: koyu mavi, sırta yakın turuncu şerit, iki açık çizgi (yazı yok). */
function coverCanvas() {
  const el = document.createElement("canvas");
  el.width = 384;
  el.height = 512;
  const ctx = el.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0b52bf";
    ctx.fillRect(0, 0, 384, 512);
    ctx.fillStyle = brand.orange;
    ctx.fillRect(28, 0, 22, 512);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.roundRect(96, 150, 220, 22, 11);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.roundRect(96, 192, 150, 14, 7);
    ctx.fill();
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Gönye (30–60–90): ortası boş üçgen. */
function setSquareGeometry() {
  const outer = new Shape();
  outer.moveTo(0, 0);
  outer.lineTo(0.62, 0);
  outer.lineTo(0, 0.36);
  outer.closePath();
  const hole = new Shape();
  hole.moveTo(0.09, 0.06);
  hole.lineTo(0.38, 0.06);
  hole.lineTo(0.09, 0.228);
  hole.closePath();
  outer.holes.push(hole);
  const geometry = new ExtrudeGeometry(outer, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geometry.center();
  return geometry;
}

function useHeroAssets() {
  const materials = useMemo(() => {
    const cover = glossy("#0b52bf", hero.fade, {
      roughness: 0.45,
      clearcoat: 0.4,
      emissiveIntensity: 0,
    });
    const front = fading(new MeshStandardMaterial({ map: coverCanvas(), roughness: 0.5 }), hero.fade);
    const pagesV = fading(new MeshStandardMaterial({ map: stripes(true), roughness: 0.9 }), hero.fade);
    const pagesH = fading(new MeshStandardMaterial({ map: stripes(false), roughness: 0.9 }), hero.fade);
    return {
      cover,
      front,
      pagesV,
      pagesH,
      pearl: glossy("#eef2ff", hero.fade, {
        roughness: 0.32,
        emissiveIntensity: 0.02,
      }),
      orange: glossy(brand.orange, hero.fade),
      sky: glossy(brand.sky, hero.fade),
      wood: glossy("#e9c9a0", hero.fade, {
        roughness: 0.6,
        clearcoat: 0,
        emissiveIntensity: 0,
      }),
      graphite: glossy("#2a2d38", hero.fade, {
        roughness: 0.4,
        emissiveIntensity: 0,
      }),
      metal: glossy("#d7dbea", hero.fade, {
        metalness: 0.9,
        roughness: 0.22,
        emissiveIntensity: 0,
      }),
      eraser: glossy("#ef8f8f", hero.fade, { roughness: 0.6, clearcoat: 0.2 }),
      acrylic: glassy(hero.fade, {
        color: brand.sky,
        transparent: true,
        opacity: 0.62,
        roughness: 0.08,
      }),
      ring: glassy(hero.fade, {
        color: "#c9d2ff",
        transparent: true,
        opacity: 0.28,
        roughness: 0.2,
        depthWrite: false,
      }),
    };
  }, []);
  const geometries = useMemo(() => {
    const cord = new CatmullRomCurve3([
      new Vector3(0, 0.125, 0),
      new Vector3(0.24, 0.118, 0),
      new Vector3(0.462, 0.11, 0),
      new Vector3(0.47, 0.0, 0),
      new Vector3(0.47, -0.1, 0),
    ]);
    return {
      pages: new BoxGeometry(0.6, 0.82, 0.106),
      ribbon: new BoxGeometry(0.035, 0.22, 0.004),
      capBase: new CylinderGeometry(0.21, 0.23, 0.18, 48),
      button: new SphereGeometry(0.03, 20, 16),
      cord: new TubeGeometry(cord, 48, 0.008, 8, false),
      tassel: new CylinderGeometry(0.016, 0.042, 0.13, 16),
      pencil: new CylinderGeometry(0.045, 0.045, 0.7, 6),
      ferrule: new CylinderGeometry(0.047, 0.047, 0.07, 24),
      eraser: new CylinderGeometry(0.044, 0.044, 0.06, 24),
      woodTip: new ConeGeometry(0.045, 0.12, 6),
      lead: new ConeGeometry(0.015, 0.04, 12),
      setSquare: setSquareGeometry(),
      nucleus: new SphereGeometry(0.075, 32, 24),
      shell: new TorusGeometry(0.24, 0.007, 12, 120),
      electron: new SphereGeometry(0.024, 16, 12),
      orbit: new TorusGeometry(1, 0.0035, 8, 256),
    };
  }, []);
  useEffect(
    () => () => {
      for (const g of Object.values(geometries)) g.dispose();
      for (const m of Object.values(materials) as Material[]) {
        (m as MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    },
    [geometries, materials],
  );
  return { materials, geometries };
}

type Assets = ReturnType<typeof useHeroAssets>;

function Book({ materials: m, geometries: g }: Readonly<Assets>) {
  const pages = [m.pagesV, m.pagesV, m.pagesH, m.pagesH, m.pagesH, m.pagesH];
  return (
    <group>
      <mesh
        geometry={roundedBox(0.64, 0.86, 0.022, 0.008)}
        position-z={0.064}
        material={[m.cover, m.cover, m.cover, m.cover, m.front, m.cover]}
      />
      <mesh geometry={roundedBox(0.64, 0.86, 0.022, 0.008)} position-z={-0.064} material={m.cover} />
      <mesh geometry={roundedBox(0.034, 0.86, 0.15, 0.014)} position-x={-0.305} material={m.cover} />
      <mesh geometry={g.pages} position-x={0.012} material={pages} />
      <mesh geometry={g.ribbon} position={[0.1, -0.5, 0.055]} material={m.orange} />
    </group>
  );
}

function Cap({ materials: m, geometries: g }: Readonly<Assets>) {
  return (
    <group>
      <mesh
        geometry={roundedBox(0.66, 0.026, 0.66, 0.01)}
        position-y={0.1}
        rotation-y={Math.PI / 4}
        material={m.pearl}
      />
      <mesh geometry={g.capBase} material={m.pearl} />
      <mesh geometry={g.button} position-y={0.125} material={m.orange} />
      <mesh geometry={g.cord} material={m.orange} />
      <mesh geometry={g.tassel} position={[0.47, -0.16, 0]} material={m.orange} />
    </group>
  );
}

function Pencil({ materials: m, geometries: g }: Readonly<Assets>) {
  return (
    <group>
      <mesh geometry={g.pencil} material={m.orange} />
      <mesh geometry={g.ferrule} position-y={0.385} material={m.metal} />
      <mesh geometry={g.eraser} position-y={0.45} material={m.eraser} />
      <mesh geometry={g.woodTip} position-y={-0.41} rotation-x={Math.PI} material={m.wood} />
      <mesh geometry={g.lead} position-y={-0.465} rotation-x={Math.PI} material={m.graphite} />
    </group>
  );
}

function SetSquare({ materials: m, geometries: g }: Readonly<Assets>) {
  return <mesh geometry={g.setSquare} material={m.acrylic} />;
}

const electrons = { at: [0, 2.1, 4.2] };

function Atom({ materials: m, geometries: g }: Readonly<Assets>) {
  const shells = useRef<(Group | null)[]>([]);
  useFrame(() => {
    const t = story.reduced ? 0 : frame.time;
    shells.current.forEach((shell, i) => {
      if (shell) shell.rotation.z = electrons.at[i] + t * (0.9 + i * 0.25);
    });
  });
  return (
    <group>
      <mesh geometry={g.nucleus} material={m.orange} />
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[Math.PI / 2, (i * Math.PI) / 3, 0]}>
          <group rotation-x={0.35}>
            <mesh geometry={g.shell} material={m.pearl} />
            <group
              ref={(group) => {
                shells.current[i] = group;
              }}
            >
              <mesh geometry={g.electron} position-x={0.24} material={m.sky} />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Her nesnenin ölçeği ve kendi duruşu (yörüngede dönerken korunur). */
const PIECES = [
  { Piece: Book, scale: 0.58, rest: new Euler(0.2, 0.5, 0.12) },
  { Piece: Cap, scale: 0.64, rest: new Euler(0.35, 0, -0.18) },
  { Piece: Pencil, scale: 0.6, rest: new Euler(0.3, 0, -0.95) },
  { Piece: SetSquare, scale: 0.72, rest: new Euler(-0.25, 0.4, 0.2) },
  { Piece: Atom, scale: 0.82, rest: new Euler(0.3, 0.2, 0) },
];

const start = new Vector3(0, 0.3, -0.25);
const at = new Vector3();

export function Hero() {
  const root = useComposition("hero");
  const frameGroup = useRef<Group>(null);
  const laptop = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const pieces = useRef<(Group | null)[]>([]);
  const assets = useHeroAssets();

  useFrame(() => {
    if (!root.current?.visible) return;
    const still = story.reduced || story.poster;
    const intro = still ? 1 : Math.min(1, story.intro);
    const t = frame.time;
    const focus = frame.focus[0];
    // Dar ekranda sahne üstte ve küçük; açılış nesnesi biraz büyütülür.
    frameGroup.current?.scale.setScalar(story.layout === "narrow" ? 1.25 : 1);
    hero.laptop.open = smoothstep(0.04, 0.38, intro);
    hero.laptop.reveal = smoothstep(0.3, 0.62, intro);
    if (laptop.current) laptop.current.position.y = -0.42 + (still ? 0 : Math.sin(t * 0.7) * 0.025);
    // Sahneden çıkarken yörünge biraz açılır.
    const spread = 1 + (1 - focus) * 0.25;
    if (ring.current) {
      const k = smoothstep(0.32, 0.6, intro);
      ring.current.visible = k > 0.001;
      ring.current.scale.set(ORBIT.rx * spread * (0.7 + 0.3 * k), ORBIT.rz * spread * (0.7 + 0.3 * k), 1);
    }
    const spin = still ? 0 : t * SPIN;
    pieces.current.forEach((piece, i) => {
      if (!piece) return;
      const k = smoothstep(0.4 + i * 0.08, 0.72 + i * 0.08, intro);
      piece.visible = k > 0.001;
      orbitPoint((i / OBJECTS) * Math.PI * 2 + 0.55 + spin, spread, at);
      piece.position.lerpVectors(start, at, k);
      const { scale, rest } = PIECES[i];
      piece.scale.setScalar(scale * (0.25 + 0.75 * k));
      piece.rotation.set(rest.x, rest.y + (still ? 0 : t * (0.25 + i * 0.04)), rest.z);
    });
  });

  return (
    <group ref={root} userData={{ fade: hero.fade }}>
      <group ref={frameGroup}>
        <group ref={laptop} position={[0, -0.42, 0.05]} rotation={[0.34, -0.42, 0]} scale={1.02}>
          <Laptop screen="board" fade={hero.fade} state={hero.laptop} />
        </group>
        <group position={ORBIT.center} rotation={ORBIT.tilt}>
          <group ref={ring}>
            <mesh
              geometry={assets.geometries.orbit}
              rotation-x={Math.PI / 2}
              material={assets.materials.ring}
              userData={{ noSample: true }}
            />
          </group>
        </group>
        {PIECES.map(({ Piece }, i) => (
          <group
            key={Piece.name}
            ref={(group) => {
              pieces.current[i] = group;
            }}
          >
            <Piece {...assets} />
          </group>
        ))}
      </group>
    </group>
  );
}
