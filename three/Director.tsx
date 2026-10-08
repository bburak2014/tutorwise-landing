"use client";
import { useFrame } from "@react-three/fiber";
import { deviceAt, poseAt, type Pose } from "./choreography.ts";
import { story } from "./story.ts";

/** Bu karenin pozu ve cihazı. Director her karede bir kez hesaplar; diğer
 *  bileşenler okur. Sahnede ilk sırada durur ki önce o çalışsın. */
export const frame: { pose: Pose; device: ReturnType<typeof deviceAt>; time: number } = {
  pose: poseAt(0, "wide"),
  device: deviceAt(0),
  time: 0,
};

export function Director() {
  useFrame((state) => {
    frame.pose = poseAt(story.beat, story.layout);
    frame.device = deviceAt(story.beat);
    frame.time = state.clock.elapsedTime;
  });
  return null;
}
