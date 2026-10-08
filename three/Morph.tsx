"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  Vector3,
  type Points,
} from "three";
import { compositions, type Composition } from "./choreography.ts";
import { frame } from "./Director.tsx";
import { sampleSurface, worldPoints, type Samples } from "./sample.ts";
import { registry } from "./scenes/kit.tsx";
import { story } from "./story.ts";

/* Nesneler arası geçiş: eski nesnenin yüzeyindeki noktalar ışık
   parçacıklarına dönüşür, kavis çizerek uçar ve yeni nesnenin yüzeyine
   oturur; parçacıklar sırayla (her birinin kendi gecikmesiyle) kalkar.
   Açılışta parçacıklar sahnenin çevresindeki bir toz bulutundan gelir.
   Örnekler bir kez alınır (sahne hazırlanırken); dünya konumları her
   geçişin başında parçaların o anki duruşundan hesaplanır. */

const vertexShader = /* glsl */ `
  attribute vec3 aTo;
  attribute vec3 aColorFrom;
  attribute vec3 aColorTo;
  attribute float aSeed;
  uniform float uT;
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float start = aSeed * 0.35;
    float t = clamp((uT - start) / 0.65, 0.0, 1.0);
    float e = t * t * (3.0 - 2.0 * t);
    float arc = sin(3.14159265 * e);
    vec3 p = mix(position, aTo, e);
    p += vec3(sin(aSeed * 41.0 + uTime * 0.9), cos(aSeed * 29.0 + uTime * 0.7), sin(aSeed * 17.0 + uTime)) * 0.32 * arc;
    p.y += arc * 0.35 * (aSeed - 0.35);
    vColor = mix(aColorFrom, aColorTo, e) * 0.75 + vec3(0.35, 0.42, 0.6) * arc;
    vAlpha = smoothstep(0.0, 0.1, uT) * (1.0 - smoothstep(0.9, 1.0, uT));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uScale * (0.55 + 0.9 * arc) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

/** Tohumlu, deterministik sayı üreteci (mulberry32): parçacıkların
 *  gecikmeleri ve toz bulutu her yüklemede aynı; güvenlikle ilgisi yok. */
function sequence(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Açılıştaki toz bulutu: sahnenin çevresinde dağınık noktalar. */
function cloud(count: number, center: Vector3, radius: number) {
  const next = sequence(7);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = next() * 2 - 1;
    const a = next() * Math.PI * 2;
    const r = radius * (0.6 + next() * 0.8);
    const s = Math.sqrt(1 - u * u);
    out[i * 3] = center.x + Math.cos(a) * s * r * 1.6;
    out[i * 3 + 1] = center.y + u * r;
    out[i * 3 + 2] = center.z + Math.sin(a) * s * r - 1;
  }
  return out;
}

/** Geçişin başında: kalkış ve varış noktaları, renkleri. */
function load(geometry: BufferGeometry, from: Samples | null, to: Samples, count: number) {
  const position = geometry.attributes.position as BufferAttribute;
  if (from) worldPoints(from, position.array as Float32Array);
  else position.array.set(cloud(count, to.meshes[0]?.getWorldPosition(new Vector3()) ?? new Vector3(), 1.6));
  worldPoints(to, (geometry.attributes.aTo as BufferAttribute).array as Float32Array);
  (geometry.attributes.aColorFrom as BufferAttribute).array.set(from ? from.colors : to.colors);
  (geometry.attributes.aColorTo as BufferAttribute).array.set(to.colors);
  for (const name of ["position", "aTo", "aColorFrom", "aColorTo"]) geometry.attributes[name].needsUpdate = true;
}

export function Morph({ count }: Readonly<{ count: number }>) {
  const points = useRef<Points>(null);
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const samples = useRef<Partial<Record<Composition, Samples>>>({});
  const pair = useRef("");
  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aTo", new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aColorFrom", new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aColorTo", new BufferAttribute(new Float32Array(count * 3), 3));
    const next = sequence(11);
    g.setAttribute("aSeed", new BufferAttribute(Float32Array.from({ length: count }, () => next()), 1));
    const m = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uT: { value: 0 }, uTime: { value: 0 }, uSize: { value: 0.028 }, uScale: { value: 1 } },
    });
    return { geometry: g, material: m };
  }, [count]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  /** Bir nesnenin örnekleri (ilk istekte bir kez alınır). */
  const sampled = (name: Composition) => {
    const root = registry[name];
    if (!root) return null;
    samples.current[name] ??= sampleSurface(root, count);
    return samples.current[name] ?? null;
  };

  // Örnekler sahne hazırlanırken önceden alınır; ilk geçiş takılmasın.
  useEffect(() => {
    const id = window.setTimeout(() => {
      for (const name of compositions) {
        const root = registry[name];
        if (root) samples.current[name] ??= sampleSurface(root, count);
      }
    }, 600);
    return () => window.clearTimeout(id);
  }, [count]);

  useFrame(() => {
    const mesh = points.current;
    if (!mesh) return;
    const morph = frame.morph;
    mesh.visible = morph !== null && !story.reduced && !story.poster;
    if (!morph || !mesh.visible) return;
    const key = `${morph.from}>${morph.to}`;
    if (key !== pair.current) {
      const to = sampled(morph.to);
      const from = morph.from === "cloud" ? null : sampled(morph.from);
      if (!to || (morph.from !== "cloud" && !from)) return;
      pair.current = key;
      load(mesh.geometry, from, to, count);
    }
    const { uniforms } = mesh.material as ShaderMaterial;
    uniforms.uT.value = morph.t;
    uniforms.uTime.value = frame.time;
    // Nokta boyu: ekranda dünya biriminin piksel karşılığı (dikey görüş açısından).
    const fov = (camera as { fov?: number }).fov ?? 30;
    uniforms.uScale.value = (size.height * Math.min(2, window.devicePixelRatio)) / (2 * Math.tan((fov * Math.PI) / 360));
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} visible={false} />;
}
