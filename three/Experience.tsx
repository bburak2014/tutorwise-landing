"use client";
import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, lazy, useRef, useState } from "react";
import { NeutralToneMapping } from "three";
import { Atmosphere } from "./Atmosphere.tsx";
import { Background } from "./Background.tsx";
import { Book } from "./Book.tsx";
import { CameraRig } from "./CameraRig.tsx";
import { installThreeConsole } from "./console.ts";
import { PairDevices, ScreensProvider } from "./Device.tsx";
import { Director } from "./Director.tsx";
// R3F tuvali saatini kurmadan önce: bilinen tek uyarıyı süz (three/console.ts).
installThreeConsole();

// Efekt paketi (postprocessing) yalnız güçlü cihazlarda indirilir.
const Effects = lazy(() => import("./Effects.tsx").then((m) => ({ default: m.Effects })));
import { Studio } from "./Studio.tsx";

/** İlk birkaç kare çizildikten sonra bir kez haber verir (tuval belirsin). */
function ReadySignal({ onReady }: Readonly<{ onReady: () => void }>) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) onReady();
  });
  return null;
}

export default function Experience({
  tier,
  onReady,
}: Readonly<{ tier: "high" | "low"; onReady: () => void }>) {
  const [dpr, setDpr] = useState(tier === "high" ? 1.75 : 1);
  const [effects, setEffects] = useState(tier === "high");

  return (
    <Canvas
      dpr={dpr}
      // PCFSoftShadowMap three r186'da kaldırıldı; R3F'nin varsayılanı o, PCF açıkça seçilir.
      shadows={effects ? "percentage" : false}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 8], fov: 30, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          setEffects(false);
        }}
        onIncline={() => setDpr((value) => Math.min(tier === "high" ? 1.75 : 1.25, value + 0.25))}
      />
      <Director />
      <Background />
      {/* Uzaktaki zemin ve geri çekilen kitap arka planın orta tonunda erir. */}
      <fog attach="fog" args={["#0b1030", 9, 24]} />
      <Studio shadows={effects} hdri={tier === "high"} />
      <CameraRig />
      {/* Kitabın dokuları yüklenene kadar tuval görünmez; sonra belirir. */}
      <Suspense fallback={null}>
        <ScreensProvider>
          <Book />
          <PairDevices />
        </ScreensProvider>
        <Atmosphere tier={tier} />
        <ReadySignal onReady={onReady} />
      </Suspense>
      {effects && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  );
}
