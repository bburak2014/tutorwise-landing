"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NeutralToneMapping,
  WebGLRenderTarget,
  type Camera,
  type Mesh,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import { Atmosphere } from "./Atmosphere.tsx";
import { Background } from "./Background.tsx";
import { Book } from "./Book.tsx";
import { CameraRig } from "./CameraRig.tsx";
import { installThreeConsole } from "./console.ts";
import { PairDevices, ScreensProvider } from "./Device.tsx";
import { Director } from "./Director.tsx";
import { Studio } from "./Studio.tsx";
import { story } from "./story.ts";
// R3F tuvali saatini kurmadan önce: bilinen tek uyarıyı süz (three/console.ts).
installThreeConsole();

// Efekt paketi (postprocessing) yalnız güçlü cihazlarda indirilir.
const Effects = lazy(() => import("./Effects.tsx").then((m) => ({ default: m.Effects })));

/** Ekran piksel yoğunluğu üst sınırı: Retina'da 2× yerine 1,5× çizilir
 *  (piksel sayısı %44 azalır, fark gözle seçilmez). */
const MAX_DPR = { high: 1.5, low: 1 } as const;

/** Tuval yalnız gerektiğinde çizilir (frameloop="demand"):
 *  - kaydırma, imleç ya da süren bir geçiş varken her karede,
 *  - boşta yarı hızda (süzülme ve toz akmaya devam eder, ekran kartı ve pil
 *    boşuna yorulmaz).
 *  Kaydırma sürerken kare süresi ölçülür; uzun süre 36 fps'in altında
 *  kalırsa çözünürlük ve efektler düşürülür (onDecline). */
function FrameScheduler({ onDecline }: Readonly<{ onDecline: () => void }>) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let id = 0;
    let tick = 0;
    let last = 0;
    let samples: number[] = [];
    let slow = 0;
    let declined = false;
    const loop = (now: number) => {
      id = requestAnimationFrame(loop);
      tick += 1;
      const moving =
        Math.abs(story.beat - story.target) > 0.0005 ||
        story.intro < 1 ||
        now - story.activeAt < 1000 ||
        now < story.busyUntil;
      if (moving && !declined && last > 0) {
        samples.push(now - last);
        if (samples.length === 60) {
          const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
          slow = mean > 28 ? slow + 1 : 0;
          samples = [];
          if (slow === 2) {
            declined = true;
            onDecline();
          }
        }
      }
      last = moving ? now : 0;
      if (moving || tick % 2 === 0) invalidate();
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [invalidate, onDecline]);
  return null;
}

/** Sahnedeki bütün malzemelerin gölgelendiricilerini derler ve dokularını
 *  ekran kartına yükler; başta gizli olan cihazlar ve sayfalar da (derleme
 *  anında kısa süre görünür sayılırlar). Efektler açıkken sahne bir ara hedefe çizilir ve ton eşleme sonda
 *  yapılır; gölgelendirici o hedefe göre değişir, derleme de o hedefle
 *  yapılmalı (yoksa cihaz ilk göründüğünde yeniden derlenir). */
function precompile(gl: WebGLRenderer, scene: Scene, camera: Camera, offscreen: WebGLRenderTarget | null) {
  const hidden: Object3D[] = [];
  const textures = new Set<Texture>();
  scene.traverse((object) => {
    const material = (object as Mesh).material;
    for (const item of [material ?? []].flat()) {
      for (const value of Object.values(item)) if ((value as Texture | null)?.isTexture) textures.add(value as Texture);
      // Gölgelendiriciye elle verilen dokular (ör. sayfa çizimleri) malzemenin userData'sında.
      for (const extra of (item.userData?.textures ?? []) as Texture[]) textures.add(extra);
    }
    if (object.visible) return;
    hidden.push(object);
    object.visible = true;
  });
  // Gizli parçaların dokuları da şimdi ekran kartına çıkar (ilk görünüşte değil).
  for (const texture of textures) gl.initTexture(texture);
  const previous = gl.getRenderTarget();
  gl.setRenderTarget(offscreen);
  const pending = gl.compileAsync(scene, camera);
  gl.setRenderTarget(previous);
  for (const object of hidden) object.visible = false;
  return pending;
}

/** Tuval görünmeden önce bütün gölgelendiriciler derlenir; derleme bitince
 *  birkaç kare çizilir ve tuval belirir. Böylece bir cihaz ilk kez
 *  göründüğünde kare donmaz. Stüdyo ışığı (HDRI) sonradan gelince
 *  gölgelendiriciler değişir; o zaman yeniden derlenir. */
function Warmup({ onReady, effects }: Readonly<{ onReady: () => void; effects: boolean }>) {
  const { gl, scene, camera } = useThree();
  const compiled = useRef(false);
  const frames = useRef(0);
  const environment = useRef<unknown>(undefined);
  const offscreen = useMemo(() => (effects ? new WebGLRenderTarget(1, 1) : null), [effects]);
  useEffect(() => () => offscreen?.dispose(), [offscreen]);
  useEffect(() => {
    environment.current = undefined;
  }, [effects]);
  useFrame(() => {
    if (scene.environment !== environment.current) {
      environment.current = scene.environment;
      precompile(gl, scene, camera, offscreen).then(() => {
        compiled.current = true;
      });
    }
    if (!compiled.current) return;
    frames.current += 1;
    if (frames.current === 3) onReady();
  });
  return null;
}

export default function Experience({
  tier,
  onReady,
}: Readonly<{ tier: "high" | "low"; onReady: () => void }>) {
  const [dpr, setDpr] = useState<number>(MAX_DPR[tier]);
  const [effects, setEffects] = useState(tier === "high");
  const decline = useCallback(() => {
    setDpr(1);
    setEffects(false);
  }, []);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, dpr]}
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
      <FrameScheduler onDecline={decline} />
      <Director />
      <Background />
      {/* Uzaktaki sahne ve geri çekilen kitap arka planın orta tonunda erir. */}
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
        <Warmup onReady={onReady} effects={effects} />
      </Suspense>
      {effects && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  );
}
