"use client";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useRef } from "react";
import { Vector2, type PerspectiveCamera } from "three";
import { cameraFor } from "./camera.ts";
import { smoothstep } from "./choreography.ts";
import { frame } from "./Director.tsx";
import { story } from "./story.ts";

/** Sinematik kamera: her sahnenin pozundaki yaklaşma ve dönmeyle kitabın
 *  çevresinde süzülür (kitap ekranda aynı yerde kalır, bkz. camera.ts);
 *  cihaz sayfadan yükselirken biraz daha yaklaşır. İmlece çok az eşlik
 *  eder; dar ekranda görüş açısı genişler ki kitap üst yarıya sığsın. */
export function CameraRig() {
  const parallax = useRef(new Vector2());
  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    const narrow = story.layout === "narrow";
    const still = story.reduced || narrow;
    easing.damp2(parallax.current, [still ? 0 : story.pointerX * 0.3, still ? 0 : story.pointerY * 0.18], 0.8, delta);
    const pose = frame.pose;
    const rise = story.reduced ? 0 : smoothstep(0, 1, frame.device.rise);
    const { position, target } = cameraFor(
      { position: [parallax.current.x, parallax.current.y, 8], target: [0, 0, 0] },
      [pose.x, pose.y, pose.z],
      { dolly: pose.dolly * (1 - 0.07 * rise), orbit: pose.orbit, tilt: pose.tilt },
    );
    camera.position.set(...position);
    const fov = narrow ? 36 : 30;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(...target);
  });
  return null;
}
