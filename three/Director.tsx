"use client";
import { useFrame } from "@react-three/fiber";
import { deviceAt, introPose, poseAt, smoothstep, spineGlow, type Pose } from "./choreography.ts";
import { story } from "./story.ts";

/** Bu karenin pozu ve cihazı. Director her karede bir kez hesaplar; diğer
 *  bileşenler okur. Sahnede ilk sırada durur ki önce o çalışsın. */
export const frame: {
  pose: Pose;
  device: ReturnType<typeof deviceAt>;
  time: number;
  /** Sırttaki sarı ışığın gücü (0–1+): açılışta yanar, kapanışta nabız gibi atar. */
  spine: number;
} = {
  pose: poseAt(0, "wide"),
  device: deviceAt(0),
  time: 0,
  spine: 1,
};

export function Director() {
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    frame.pose = introPose(poseAt(story.beat, story.layout), story.intro);
    frame.device = deviceAt(story.beat);
    frame.time = time;
    // Kapanış: kitap kapanınca sırt ışığı yavaşça nabız gibi atar.
    const finale = story.reduced ? 0 : smoothstep(8.8, 9.4, story.beat);
    frame.spine = spineGlow(story.intro) * (1 + finale * (0.35 + 0.35 * Math.sin(time * 2.2)));
  });
  return null;
}
