"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
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
import { dissolvable, type Dissolve } from "../dissolve.ts";

/** Sahnedeki nesnelerin kök grupları; parçacıklar buradan örneklenir. */
export const registry: Partial<Record<Composition, Group>> = {};

/** Bir nesnenin kökü: görünürlüğü ve çözülmesi sahne durumundan (frame)
 *  gelir. `dissolve` nesnenin bütün malzemelerinin paylaştığı değer;
 *  kökün userData'sında taşınır ki her karede oradan yazılsın. */
export function useComposition(name: Composition) {
  const root = useRef<Group>(null);
  useEffect(() => {
    const group = root.current;
    if (group) registry[name] = group;
    return () => {
      if (registry[name] === group) delete registry[name];
    };
  }, [name]);
  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const present = frame.presence[name];
    group.visible = present > 0.001;
    (group.userData.dissolve as Dissolve).value = 1 - present;
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
export function glassy(dissolve: Dissolve, parameters: MeshPhysicalMaterialParameters = {}) {
  return dissolvable(
    new MeshPhysicalMaterial({ color: "#f4f6ff", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, ...parameters }),
    dissolve,
  );
}

/** Marka renginde parlak plastik. */
export function glossy(color: string, dissolve: Dissolve, parameters: MeshPhysicalMaterialParameters = {}) {
  return dissolvable(
    new MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      emissive: color,
      emissiveIntensity: 0.06,
      ...parameters,
    }),
    dissolve,
  );
}

/** Tuval çizimini taşıyan yüzey (kart önü, rozet…). */
export function printed(canvas: HTMLCanvasElement, dissolve: Dissolve, roughness = 0.4) {
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  return dissolvable(new MeshStandardMaterial({ map, roughness, metalness: 0 }), dissolve);
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
