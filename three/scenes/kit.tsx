"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
  CanvasTexture,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Group,
  type MeshPhysicalMaterialParameters,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { smoothstep, type Composition } from "../choreography.ts";
import { frame } from "../Director.tsx";
import { applyFade, fading, type Fade } from "../fade.ts";

/** Bir nesnenin kökü: görünürlüğü sahne durumundan (frame) gelir. Geçişte
 *  ışık efekti yok: nesne saydamlaşır, biraz küçülür ve aşağı kayar; gelen
 *  nesne tersini yapar. `fade` kökün userData'sında taşınır. */
export function useComposition(name: Composition) {
  const root = useRef<Group>(null);
  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const present = frame.presence[name];
    group.visible = present > 0.001;
    applyFade(group.userData.fade as Fade, present);
    group.scale.setScalar(0.9 + 0.1 * present);
    group.position.y = (1 - present) * -0.2;
  });
  return root;
}

/** Sıralı belirme: n öğeden i'incisi, sahne oturdukça (f: 0–1) sırayla gelir. */
export function stagger(f: number, i: number, n: number, span = 0.55) {
  const start = (i / Math.max(1, n)) * (1 - span);
  return smoothstep(start, start + span, f);
}

/** Aşmalı yerleşme (biraz ileri gidip geri gelir): kartların "fırlama" hissi. */
export function overshoot(t: number) {
  const c = 1.7;
  const x = t - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}

/** Cam gibi parlak yüzey (kartlar, levhalar). */
export function glassy(fade: Fade, parameters: MeshPhysicalMaterialParameters = {}) {
  return fading(
    new MeshPhysicalMaterial({ color: "#f4f6ff", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, ...parameters }),
    fade,
  );
}

/** Marka renginde parlak plastik. */
export function glossy(color: string, fade: Fade, parameters: MeshPhysicalMaterialParameters = {}) {
  return fading(
    new MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      emissive: color,
      emissiveIntensity: 0.06,
      ...parameters,
    }),
    fade,
  );
}

/** Tuval çizimini taşıyan yüzey (kart önü, rozet…). */
export function printed(canvas: HTMLCanvasElement, fade: Fade, roughness = 0.4) {
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  return fading(new MeshStandardMaterial({ map, roughness, metalness: 0 }), fade);
}

const boxes = new Map<string, RoundedBoxGeometry>();

/** Yuvarlak köşeli kutu; aynı ölçüler tek geometriyi paylaşır. */
export function roundedBox(w: number, h: number, d: number, r: number) {
  const key = `${w}:${h}:${d}:${r}`;
  let geometry = boxes.get(key);
  if (!geometry) {
    geometry = new RoundedBoxGeometry(w, h, d, 3, r);
    boxes.set(key, geometry);
  }
  return geometry;
}
