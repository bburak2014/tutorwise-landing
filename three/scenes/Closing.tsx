"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CylinderGeometry, type Group } from "three";
import { screenReveal } from "../choreography.ts";
import { Device, type DeviceState } from "../Device.tsx";
import { frame } from "../Director.tsx";
import type { Dissolve } from "../dissolve.ts";
import { story } from "../story.ts";
import { extrudePath, logoMaterials, logoParts } from "./Logo.tsx";
import { glassy, glossy, overshoot, roundedBox, stagger, useComposition } from "./kit.tsx";

/* Kapanışa giden iki sahne: "Kimler için" (öğretmen, öğrenci, veli) ve
   "Her yerde" (metnin iki yanında tablet ve telefon). */

// ── Kimler için: üç madalyon; simgeler logonun kendi parçalarından ──

const roles = { dissolve: { value: 1 } as Dissolve };
const MEDALS: [number, number, number][] = [
  [-0.85, 1.05, -0.4],
  [0.05, 1.3, -0.2],
  [0.95, 1.05, -0.4],
];

export function Roles() {
  const root = useComposition("roles");
  const medals = useRef<(Group | null)[]>([]);
  const materials = useMemo(
    () => ({
      // Koyu cam disk: inci beyazı kep ve renkli sayfalar üstünde seçilsin.
      disc: glassy(roles.dissolve, { color: "#1c2a6e", transparent: true, opacity: 0.85, roughness: 0.15 }),
      rim: glossy("#c9cfe6", roles.dissolve, { metalness: 0.9, roughness: 0.25 }),
      bubble: glossy("#08aaf9", roles.dissolve),
      ...logoMaterials(roles.dissolve),
    }),
    [],
  );
  const geometry = useMemo(() => {
    const part = (name: string) => {
      const p = logoParts.find((x) => x.name === name);
      return p ? extrudePath(p.d, p.depth, p.z) : null;
    };
    return {
      disc: new CylinderGeometry(0.4, 0.4, 0.04, 64),
      rim: new CylinderGeometry(0.42, 0.42, 0.03, 64, 1, true),
      cap: [part("cap-base"), part("cap-top"), part("tassel")],
      pages: [part("lower-left"), part("lower-right"), part("upper-left"), part("upper-right")],
    };
  }, []);
  useEffect(
    () => () => {
      for (const m of Object.values(materials)) m.dispose();
      geometry.disc.dispose();
      geometry.rim.dispose();
      for (const g of [...geometry.cap, ...geometry.pages]) g?.dispose();
    },
    [materials, geometry],
  );

  useFrame(() => {
    if (!root.current?.visible) return;
    const f = frame.focus[7];
    const t = frame.time;
    medals.current.forEach((medal, i) => {
      if (!medal) return;
      const k = overshoot(stagger(f, i, 4));
      medal.scale.setScalar(Math.max(0.001, k));
      medal.rotation.y = story.reduced ? 0 : Math.sin(t * 0.6 + i * 2) * 0.35;
      medal.position.y = MEDALS[i][1] + (story.reduced ? 0 : Math.sin(t * 0.8 + i) * 0.03);
    });
  });

  const pageColors = [materials.sky, materials.royal, materials.orange, materials.sky];
  return (
    <group ref={root} userData={{ dissolve: roles.dissolve }}>
      {MEDALS.map((at, i) => (
        <group
          key={i}
          ref={(group) => {
            medals.current[i] = group;
          }}
          position={at}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]} geometry={geometry.disc} material={materials.disc} />
          <mesh rotation={[Math.PI / 2, 0, 0]} geometry={geometry.rim} material={materials.rim} />
          <group position-z={0.04} scale={0.5}>
            {i === 0 &&
              geometry.cap.map((g, j) => g && <mesh key={j} position-y={-0.4} geometry={g} material={materials.ink} />)}
            {i === 1 && geometry.pages.map((g, j) => g && <mesh key={j} position-y={0.1} geometry={g} material={pageColors[j]} />)}
            {i === 2 && (
              <group scale={1.4}>
                <mesh geometry={roundedBox(0.4, 0.28, 0.06, 0.09)} material={materials.bubble} />
                <mesh position={[-0.1, -0.17, 0]} rotation={[0, 0, 0.6]} material={materials.bubble}>
                  <coneGeometry args={[0.05, 0.12, 3]} />
                </mesh>
                {[-0.09, 0, 0.09].map((x) => (
                  <mesh key={x} position={[x, 0, 0.035]} material={materials.ink}>
                    <sphereGeometry args={[0.026, 16, 12]} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        </group>
      ))}
    </group>
  );
}

// ── Her yerde: tablet ve telefon metnin iki yanında ──

const devices = {
  dissolve: { value: 1 } as Dissolve,
  tablet: { reveal: 0 } as DeviceState,
  phone: { reveal: 0 } as DeviceState,
};

/** Konumlar sahne merkezine göre (geniş ekranda merkez metnin sağında). */
const PLACES = {
  wide: { tablet: [0.83, 0.05, -0.4], phone: [-4.57, 0.02, 0.1], scale: 1 },
  narrow: { tablet: [-0.5, 0.1, -0.3], phone: [1.2, -0.15, 0.2], scale: 1.3 },
} as const;

export function Devices() {
  const root = useComposition("devices");
  const tablet = useRef<Group>(null);
  const phone = useRef<Group>(null);
  useFrame(() => {
    if (!root.current?.visible || !tablet.current || !phone.current) return;
    const f = frame.focus[8];
    devices.tablet.reveal = screenReveal(f);
    devices.phone.reveal = screenReveal(Math.max(0, f - 0.08));
    const place = PLACES[story.layout];
    const bob = story.reduced ? 0 : Math.sin(frame.time * 0.8) * 0.03;
    const lift = (1 - f) * -0.5;
    tablet.current.position.set(place.tablet[0], place.tablet[1] + lift + bob, place.tablet[2]);
    phone.current.position.set(place.phone[0], place.phone[1] + lift - bob, place.phone[2]);
    tablet.current.scale.setScalar(place.scale * 0.95);
    phone.current.scale.setScalar(place.scale * 1.1);
  });
  return (
    <group ref={root} userData={{ dissolve: devices.dissolve }}>
      <group ref={tablet} rotation={[0.05, -0.52, 0.03]}>
        <Device kind="tablet" screen="calendar" dissolve={devices.dissolve} state={devices.tablet} />
      </group>
      <group ref={phone} rotation={[0.04, 0.48, -0.04]}>
        <Device kind="phone" screen="summary" dissolve={devices.dissolve} state={devices.phone} />
      </group>
    </group>
  );
}
