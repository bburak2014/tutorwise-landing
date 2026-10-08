"use client";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import type { PerspectiveCamera } from "three";
import { story } from "./story.ts";

/** Kamera imlece çok az eşlik eder; dar ekranda görüş açısı genişler ki
 *  kitap ekranın üst yarısına sığsın. */
export function CameraRig() {
  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    const narrow = story.layout === "narrow";
    const still = story.reduced || narrow;
    easing.damp3(
      camera.position,
      [still ? 0 : story.pointerX * 0.3, still ? 0 : story.pointerY * 0.18, 8],
      0.8,
      delta,
    );
    const fov = narrow ? 36 : 30;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(0, 0, 0);
  });
  return null;
}
