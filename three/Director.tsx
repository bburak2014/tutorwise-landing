"use client";
import { useFrame } from "@react-three/fiber";
import type { CameraMove } from "./camera.ts";
import {
  cameraAt,
  compositions,
  focusAt,
  jumpPresence,
  presence,
  sceneComposition,
  sceneOf,
  scenes,
  smoothstep,
  stageAt,
  type Composition,
} from "./choreography.ts";
import { story } from "./story.ts";

/** Doğrudan geçişin süresi (ms): bağlantı ya da hızlı kaydırma sonrası. */
export const JUMP_MS = 700;

/** Bu karenin sahne durumu. Director her karede bir kez hesaplar (sahnede
 *  ilk sırada durur); nesneler ve kamera okur. */
export const frame = {
  time: 0,
  beat: 0,
  /** Nesnelerin görünürlüğü (0–1). */
  presence: Object.fromEntries(compositions.map((c) => [c, 0])) as Record<Composition, number>,
  /** Her sahnenin oturma oranı (0–1); nesnelerin iç hareketleri izler. */
  focus: scenes.map(() => 0),
  /** Şu an görünen (ya da gelmekte olan) nesnenin sahnesi. */
  scene: 0,
  camera: { dolly: 1, orbit: 0, tilt: 0 } as CameraMove,
};

const mix = (a: CameraMove, b: CameraMove, t: number): CameraMove => ({
  dolly: a.dolly + (b.dolly - a.dolly) * t,
  orbit: a.orbit + (b.orbit - a.orbit) * t,
  tilt: a.tilt + (b.tilt - a.tilt) * t,
});

/** Doğrudan geçiş: aradaki sahneler oynatılmaz, eski nesne olduğu gibi
 *  solar (ekranı açık kalır), yenisi belirirken kendi hareketini yapar. Aynı
 *  nesne iki sahnede de varsa (açılış ve kapanıştaki dizüstü) bir pozdan
 *  ötekine yumuşakça geçer. */
function jumping(jump: NonNullable<typeof story.jump>, k: number) {
  const source = sceneOf(jump.from);
  const target = sceneOf(jump.to);
  const same = sceneComposition[source] === sceneComposition[target];
  const t = smoothstep(0, 1, k);
  const arrive = same ? t : smoothstep(0.45, 1, k);
  frame.presence = jumpPresence(jump.from, jump.to, k);
  for (let s = 0; s < scenes.length; s++) frame.focus[s] = 0;
  frame.focus[source] = focusAt(jump.from, source) * (same ? 1 - t : 1);
  frame.focus[target] = Math.max(frame.focus[target], arrive);
  frame.scene = k < 0.5 ? source : target;
  frame.camera = mix(cameraAt(jump.from, story.layout), cameraAt(jump.to, story.layout), t);
}

function following(beat: number) {
  frame.presence = presence(beat);
  for (let s = 0; s < scenes.length; s++) frame.focus[s] = focusAt(beat, s);
  const stage = stageAt(beat);
  frame.scene = stage.t < 0.5 ? stage.from : stage.to;
  frame.camera = cameraAt(beat, story.layout);
}

export function Director() {
  useFrame((state) => {
    frame.time = state.clock.elapsedTime;
    frame.beat = story.beat;
    const jump = story.jump;
    const k = jump ? Math.min(1, (performance.now() - jump.start) / JUMP_MS) : 1;
    if (jump && k < 1) jumping(jump, k);
    else {
      story.jump = null;
      following(story.beat);
    }
    // Açılış: o an görünen nesne ışık efekti olmadan, kısa sürede belirir;
    // asıl açılış hareketini nesnenin kendisi yapar (ör. dizüstünün kapağı).
    if (story.intro < 1) {
      const current = sceneComposition[frame.scene];
      frame.presence[current] *= smoothstep(0, 0.25, story.intro);
    }
  });
  return null;
}
