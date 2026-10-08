"use client";
import { useFrame } from "@react-three/fiber";
import type { CameraMove } from "./camera.ts";
import {
  cameraAt,
  compositions,
  focusAt,
  logoOpen,
  morphAt,
  presence,
  scenes,
  smoothstep,
  stageAt,
  sceneComposition,
  type Composition,
} from "./choreography.ts";
import { story } from "./story.ts";

/** Bu karenin sahne durumu. Director her karede bir kez hesaplar (sahnede
 *  ilk sırada durur); nesneler, kamera ve parçacıklar okur. */
export const frame = {
  time: 0,
  beat: 0,
  /** Nesnelerin görünürlüğü (0–1). */
  presence: Object.fromEntries(compositions.map((c) => [c, 0])) as Record<Composition, number>,
  /** Her sahnenin oturma oranı (0–1); nesnelerin iç hareketleri izler. */
  focus: scenes.map(() => 0),
  /** Parçacık geçişi: iki nesne arası, açılışta da toz bulutundan ilk nesneye. */
  morph: null as { from: Composition | "cloud"; to: Composition; t: number } | null,
  /** Logonun katmanlarının ayrılması (Biz kimiz). */
  open: 0,
  /** Şu an görünen (ya da gelmekte olan) nesnenin sahnesi. */
  scene: 0,
  camera: { dolly: 1, orbit: 0, tilt: 0 } as CameraMove,
};

export function Director() {
  useFrame((state) => {
    const beat = story.beat;
    frame.time = state.clock.elapsedTime;
    frame.beat = beat;
    frame.presence = presence(beat);
    for (let s = 0; s < scenes.length; s++) frame.focus[s] = focusAt(beat, s);
    const stage = stageAt(beat);
    frame.scene = stage.t < 0.5 ? stage.from : stage.to;
    frame.open = logoOpen(beat);
    frame.camera = cameraAt(beat, story.layout);
    frame.morph = morphAt(beat);
    // Açılış: o an görünen nesne toz bulutundan parçacıklarla kurulur.
    if (story.intro < 1) {
      const current = sceneComposition[frame.scene];
      const appear = smoothstep(0.45, 0.92, story.intro);
      for (const c of compositions) frame.presence[c] = c === current ? appear : 0;
      frame.morph = { from: "cloud", to: current, t: story.intro };
    }
  });
  return null;
}
