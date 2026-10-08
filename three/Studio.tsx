"use client";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense } from "react";

/* Stüdyo ışığı. Güçlü cihazlarda yansımalar CC0 bir stüdyo HDRI'sinden
   (public/3d/LICENSES.md), üstüne kodla kurulmuş ışık panelleri eklenir;
   zayıf cihazda yalnız ışık panelleri (dosya indirilmez). Gölgeyi anahtar
   ışık verir; sarı ışık kaynağı yalnızca küçük bir vurgu. */

function Formers() {
  return (
    <>
      <Lightformer form="rect" intensity={1.6} color="#ffffff" scale={[10, 4, 1]} position={[0, 5, 5]} rotation-x={Math.PI / 2.6} />
      <Lightformer form="rect" intensity={1.2} color="#8ea0ff" scale={[3, 8, 1]} position={[-6, 1, 2]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={0.7} color="#aab6ff" scale={[3, 8, 1]} position={[6, 0, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="ring" intensity={0.8} color="#ffd84a" scale={1.6} position={[3, -2.5, 3]} />
    </>
  );
}

function PlainEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <Formers />
    </Environment>
  );
}

export function Studio({ shadows, hdri }: Readonly<{ shadows: boolean; hdri: boolean }>) {
  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight
        position={[2.5, 4.5, 6]}
        intensity={1.45}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {hdri ? (
        <Suspense fallback={<PlainEnvironment />}>
          <Environment
            files="/3d/hdri/studio_small_09_1k.hdr"
            environmentIntensity={0.75}
            resolution={256}
            frames={1}
          >
            <Formers />
          </Environment>
        </Suspense>
      ) : (
        <PlainEnvironment />
      )}
    </>
  );
}
