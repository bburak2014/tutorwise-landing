"use client";
import { MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  ShaderMaterial,
  type Group,
  type Material,
  type Mesh,
} from "three";
import { smoothstep } from "./choreography.ts";
import { frame } from "./Director.tsx";
import { story } from "./story.ts";

/* Stüdyo atmosferi: kitabın altında parlak, bulanık yansıtan bir zemin
   (yalnız güçlü cihaz + geniş ekran; ikinci bir çizim geçişi ister), üstten
   kitaba düşen yumuşak bir ışık huzmesi ve havada süzülen ince toz. */

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Üstte dar, aşağı doğru genişleyen ve sönen bir koni.
    float width = mix(0.08, 0.5, 1.0 - vUv.y);
    // smoothstep'te alt sınır üst sınırdan küçük olmalı; tersi tanımsızdır,
    // bazı sürücülerde NaN üretir ve Bloom bütün ekranı karartır.
    float cone = 1.0 - smoothstep(0.0, width, abs(vUv.x - 0.5));
    // Kenar piksellerinde vUv çok küçük bir eksi değer alabilir; pow eksi
    // tabanda NaN verir ve Bloom bu NaN'ı bütün ekrana yayıp karartır.
    float y = clamp(vUv.y, 0.0, 1.0);
    float fall = pow(y, 1.6) * smoothstep(0.0, 0.25, y);
    float shimmer = 0.85 + 0.15 * sin(uTime * 0.6 + y * 6.0);
    gl_FragColor = vec4(uColor, clamp(cone * fall * shimmer * uStrength, 0.0, 1.0));
  }
`;

function Beam() {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: {
          uColor: { value: new Color("#8ea0ff") },
          uStrength: { value: 0.32 },
          uTime: { value: 0 },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    if (!mesh.current) return;
    const narrow = story.layout === "narrow";
    // Huzme kitabı izler ama yavaşça; dar ekranda üstte ortada.
    const x = narrow ? 0 : frame.pose.x * 0.9;
    mesh.current.position.x += (x - mesh.current.position.x) * 0.04;
    mesh.current.position.y = narrow ? 2.6 : 1.7;
    const { uniforms } = mesh.current.material as ShaderMaterial;
    uniforms.uTime.value = frame.time;
    uniforms.uStrength.value = 0.32 * Math.min(1, frame.spine) * frame.pose.glow;
  });

  return (
    <mesh ref={mesh} material={material} position={[1.6, 1.7, -1.2]} rotation={[0, 0, 0.18]}>
      <planeGeometry args={[3.2, 5.5]} />
    </mesh>
  );
}

/** Zeminin kenarlara doğru sönümü (alphaMap yeşil kanalı okur): ufuk çizgisi oluşmasın. */
function radialFade() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.45, "#9a9a9a");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new CanvasTexture(canvas);
}

/** Yalnız kitabın ayakta durduğu sahnelerde (açılış ve kapanış) görünür;
 *  görünmezken yansıma geçişi de çizilmez. */
function Floor() {
  const mesh = useRef<Mesh>(null);
  const fade = useMemo(() => radialFade(), []);
  useEffect(() => () => fade.dispose(), [fade]);
  useFrame(() => {
    if (!mesh.current) return;
    const beat = story.beat;
    const amount = Math.max(1 - smoothstep(0.8, 1.3, beat), smoothstep(8.6, 9.2, beat));
    const visible = story.layout === "wide" && !story.poster && amount > 0.01;
    mesh.current.visible = visible;
    if (!visible) return;
    (mesh.current.material as Material).opacity = amount;
    mesh.current.position.x = frame.pose.x;
  });
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position={[1.6, -1.25, 0]}>
      <planeGeometry args={[7, 6]} />
      <MeshReflectorMaterial
        transparent
        alphaMap={fade}
        blur={[420, 140]}
        resolution={512}
        mixBlur={1}
        mixStrength={1.4}
        mixContrast={1}
        roughness={0.9}
        depthScale={0.9}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#0a0e2a"
        metalness={0.5}
        mirror={0.4}
      />
    </mesh>
  );
}

function Dust({ count }: Readonly<{ count: number }>) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const narrow = story.layout === "narrow";
    group.current.position.set(narrow ? 0 : frame.pose.x * 0.6, narrow ? 1.2 : 0.2, 0);
  });
  return (
    <group ref={group}>
      <Sparkles count={count} scale={[7, 4.5, 4]} size={1.6} speed={0.22} opacity={0.45} noise={0.6} color="#c9d2ff" />
      <Sparkles count={Math.round(count / 6)} scale={[5, 3.5, 3]} size={2.4} speed={0.18} opacity={0.6} color="#ffd84a" />
    </group>
  );
}

export function Atmosphere({ tier }: Readonly<{ tier: "high" | "low" }>) {
  return (
    <>
      {tier === "high" && <Floor />}
      <Beam />
      <Dust count={tier === "high" ? 90 : 36} />
    </>
  );
}
