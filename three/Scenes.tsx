"use client";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useRef } from "react";
import { Vector2, type Group } from "three";
import type { Layout } from "./choreography.ts";
import { Devices, Roles } from "./scenes/Closing.tsx";
import { Book } from "./scenes/Book.tsx";
import { Board, Calendar, Credits, Homework, Summary } from "./scenes/Features.tsx";
import { Hero } from "./scenes/Hero.tsx";
import { story } from "./story.ts";

/** Nesnelerin durduğu yer: geniş ekranda metnin sağında, dar ekranda üstte
 *  ortada (daha küçük). Bütün nesneler aynı yerde belirir; kamera
 *  çevresinde döner. */
export const STAGE: Record<Layout, { x: number; y: number; z: number; scale: number }> = {
  wide: { x: 1.85, y: -0.1, z: 0, scale: 1 },
  narrow: { x: 0, y: 1.1, z: 0, scale: 0.5 },
};

export function Scenes() {
  const root = useRef<Group>(null);
  const pointer = useRef(new Vector2());
  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    const stage = STAGE[story.layout];
    const still = story.reduced || story.layout === "narrow";
    easing.damp2(pointer.current, [still ? 0 : story.pointerX, still ? 0 : story.pointerY], 0.6, delta);
    group.position.set(stage.x, stage.y, stage.z);
    group.scale.setScalar(stage.scale);
    group.rotation.set(-pointer.current.y * 0.06, pointer.current.x * 0.1, 0);
  });
  return (
    <>
      <group ref={root}>
        <Hero />
        <Book />
        <Calendar />
        <Board />
        <Homework />
        <Credits />
        <Summary />
        <Roles />
        <Devices />
      </group>
    </>
  );
}
