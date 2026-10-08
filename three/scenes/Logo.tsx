"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { ExtrudeGeometry, type Group, type Mesh } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { MARK_CENTER, brand, capParts, markParts } from "@/lib/brand.ts";
import { frame } from "../Director.tsx";
import type { Fade } from "../fade.ts";
import { story } from "../story.ts";
import { glossy, useComposition } from "./kit.tsx";

/* 3D logo: lib/brand.ts'teki işaretin yolları kalınlaştırılır (extrude).
   Koyu sahnede sitedeki logo gibi lacivert kısımlar inci beyazı, sayfalar
   kendi renklerinde. Sahneler:
   - açılış: parçalar dört yandan gelip birleşir (story.intro),
   - Biz kimiz: katmanlar ayrılır, sayfalar kitap gibi açılır (frame.open),
   - kapanış: kep havaya atılır, dönerek yerine konar. */

/** İşaret birimini dünya birimine çevirir: işaret ~2,3 birim genişlikte. */
const UNIT = 2.3 / 651;
const MARK_MIDDLE = 306;

type Part = {
  name: string;
  d: string;
  depth: number;
  /** Katmanın önü (işaret biriminde, kapakların arkası 0). */
  z: number;
  color: "ink" | "orange" | "sky" | "royal";
  /** Biz kimiz'de katmanların ayrılması: kayma (dünya birimi) ve sırt çevresinde dönme. */
  open: { x: number; y: number; z: number; ry: number; rx: number };
  /** Açılışta parçanın geldiği yer (dünya birimi) ve dönüşü. */
  from: { x: number; y: number; z: number; rz: number };
};

const KNOB = `M${capParts.knob.cx - capParts.knob.r} ${capParts.knob.cy} a${capParts.knob.r} ${capParts.knob.r} 0 1 0 ${capParts.knob.r * 2} 0 a${capParts.knob.r} ${capParts.knob.r} 0 1 0 ${-capParts.knob.r * 2} 0 Z`;
const CORD = "M472 80 L476 80 L476 97 L472 97 Z";
const none = { x: 0, y: 0, z: 0, ry: 0, rx: 0 };

export const logoParts: Part[] = [
  { name: "cover-left", d: markParts.cover.left, depth: 34, z: 0, color: "ink", open: { ...none, x: -0.1, z: -0.2 }, from: { x: -1.3, y: -0.2, z: 0, rz: 0.4 } },
  { name: "cover-right", d: markParts.cover.right, depth: 34, z: 0, color: "ink", open: { ...none, x: 0.1, z: -0.2 }, from: { x: 1.3, y: -0.2, z: 0, rz: -0.4 } },
  { name: "lower-left", d: markParts.lower.left, depth: 20, z: 32, color: "sky", open: { ...none, z: 0.1, ry: 0.18 }, from: { x: -0.5, y: -1, z: 0.6, rz: 0.3 } },
  { name: "lower-right", d: markParts.lower.right, depth: 20, z: 32, color: "royal", open: { ...none, z: 0.1, ry: -0.18 }, from: { x: 0.5, y: -1, z: 0.6, rz: -0.3 } },
  { name: "upper-left", d: markParts.upper.left, depth: 20, z: 42, color: "orange", open: { ...none, z: 0.26, ry: 0.3 }, from: { x: -0.7, y: 0.4, z: 0.9, rz: 0.5 } },
  { name: "upper-right", d: markParts.upper.right, depth: 20, z: 42, color: "sky", open: { ...none, z: 0.26, ry: -0.3 }, from: { x: 0.7, y: 0.4, z: 0.9, rz: -0.5 } },
  { name: "cap-base", d: capParts.base, depth: 34, z: 30, color: "ink", open: { x: 0, y: 0.3, z: 0.42, ry: 0, rx: -0.2 }, from: { x: 0, y: 1.4, z: 0.3, rz: 0 } },
  { name: "cap-top", d: capParts.top, depth: 16, z: 64, color: "ink", open: { x: 0, y: 0.3, z: 0.42, ry: 0, rx: -0.2 }, from: { x: 0, y: 1.6, z: 0.3, rz: 1.1 } },
  { name: "cord", d: CORD, depth: 6, z: 74, color: "ink", open: { x: 0, y: 0.3, z: 0.42, ry: 0, rx: -0.2 }, from: { x: 0, y: 1.6, z: 0.3, rz: 1.1 } },
  { name: "knob", d: KNOB, depth: 10, z: 72, color: "ink", open: { x: 0, y: 0.3, z: 0.42, ry: 0, rx: -0.2 }, from: { x: 0, y: 1.6, z: 0.3, rz: 1.1 } },
  { name: "tassel", d: capParts.tassel, depth: 10, z: 72, color: "ink", open: { x: 0, y: 0.3, z: 0.42, ry: 0, rx: -0.2 }, from: { x: 0, y: 1.6, z: 0.3, rz: 1.1 } },
];

const CAP = new Set(["cap-base", "cap-top", "cord", "knob", "tassel"]);

/** Bir yolu kalınlaştırır; merkez işaretin ortası, y yukarı (SVG'de aşağı). */
export function extrudePath(d: string, depth: number, z: number) {
  // y ekseni yolun kendisinde çevrilir (SVG aşağı, three yukarı); ölçek
  // pozitif kalır, yüzlerin yönü bozulmaz.
  const data = new SVGLoader().parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path transform="matrix(1 0 0 -1 0 0)" d="${d}"/></svg>`,
  );
  // Her yolun tek alt yolu var (delik yok): toShapes onu her zaman dolu şekil yapar.
  const shapes = data.paths.flatMap((path) => path.toShapes());
  const bevel = Math.min(4, depth / 4);
  const geometry = new ExtrudeGeometry(shapes, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 28,
  });
  geometry.translate(-MARK_CENTER, MARK_MIDDLE, z + bevel);
  geometry.scale(UNIT, UNIT, UNIT);
  geometry.computeVertexNormals();
  return geometry;
}

export function logoMaterials(fade: Fade) {
  return {
    ink: glossy("#eef2ff", fade, { emissiveIntensity: 0.02, roughness: 0.34 }),
    orange: glossy(brand.orange, fade),
    sky: glossy(brand.sky, fade),
    royal: glossy("#0b52bf", fade, { emissiveIntensity: 0.1 }),
  };
}

const fade: Fade = { value: 1 };
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Kepin havaya atılması: kapanış sahnesi oturduktan sonra bir kez. */
const toss = { since: null as number | null };

export function Logo() {
  const root = useComposition("logo");
  const pivot = useRef<Group>(null);
  const meshes = useRef<(Mesh | null)[]>([]);
  const geometries = useMemo(() => logoParts.map((part) => extrudePath(part.d, part.depth, part.z)), []);
  const materials = useMemo(() => logoMaterials(fade), []);
  useEffect(
    () => () => {
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
    },
    [geometries, materials],
  );

  useFrame(() => {
    const group = pivot.current;
    if (!group?.parent?.visible) return;
    const still = story.reduced;
    const t = frame.time;
    const open = frame.open;
    const final = frame.scene >= 8;
    // Sahneye göre duruş: açılışta hafif dönük, Biz kimiz'de biraz daha yandan,
    // kapanışta ortadaki metnin sağında ve daha küçük.
    const ry = final ? -0.3 : -0.4 - 0.22 * open;
    group.rotation.set(0.08 + 0.1 * open, ry + (still ? 0 : Math.sin(t * 0.35) * 0.05), still ? 0 : Math.sin(t * 0.5) * 0.015);
    const aside = final && story.layout === "wide";
    group.position.set(aside ? 0.95 : 0, (aside ? 0.1 : 0) + (still ? 0 : Math.sin(t * 0.7) * 0.04), aside ? -0.7 : 0);
    group.scale.setScalar(aside ? 0.7 : 1 - 0.05 * open);

    const intro = ease(Math.min(1, story.intro));
    const focus = frame.focus[9];
    if (focus < 0.5) toss.since = null;
    else if (toss.since === null && focus > 0.98 && !still) toss.since = t;
    const tossT = toss.since === null ? 0 : Math.min(1, (t - toss.since) / 1.8);
    const lift = Math.sin(Math.PI * tossT);

    logoParts.forEach((part, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const away = 1 - intro;
      const cap = CAP.has(part.name);
      mesh.position.set(
        part.open.x * open + part.from.x * away,
        part.open.y * open + part.from.y * away + (cap ? lift * 0.75 : 0),
        part.open.z * open + part.from.z * away + (cap ? lift * 0.3 : 0),
      );
      mesh.rotation.set(
        part.open.rx * open,
        part.open.ry * open,
        part.from.rz * away + (cap ? ease(tossT) * Math.PI * 2 : 0),
      );
    });
  });

  return (
    <group ref={root} userData={{ fade }}>
      <group ref={pivot}>
        {logoParts.map((part, i) => (
          <mesh
            key={part.name}
            ref={(mesh) => {
              meshes.current[i] = mesh;
            }}
            geometry={geometries[i]}
            material={materials[part.color]}
          />
        ))}
      </group>
    </group>
  );
}
