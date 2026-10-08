"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { screenReveal, type DeviceKind, type ScreenId } from "../choreography.ts";
import { Device, type DeviceState } from "../Device.tsx";
import { frame } from "../Director.tsx";
import type { Fade } from "../fade.ts";
import { story } from "../story.ts";
import { stagger, useComposition } from "./kit.tsx";

/* Kapanışa giden iki sahne: "Kimler için" (öğretmen, öğrenci, veli) ve
   "Her yerde" (metnin iki yanında tablet ve telefon). */

// ── Kimler için: her rolün kendi cihazı ve ekranı ──

const roles = {
  fade: { value: 1 } as Fade,
  devices: [{ reveal: 0 }, { reveal: 0 }, { reveal: 0 }] as DeviceState[],
};
/** Öğrenci (ödev), öğretmen (takvim), veli (haftalık özet); hafif bir yayda. */
const ROLE_DEVICES: { kind: DeviceKind; screen: ScreenId; at: [number, number, number]; turn: number; scale: number }[] = [
  { kind: "phone", screen: "homework", at: [-1.5, 1.0, -0.12], turn: 0.42, scale: 1.35 },
  { kind: "tablet", screen: "calendar", at: [-0.22, 1.1, -0.42], turn: 0, scale: 1.2 },
  { kind: "phone", screen: "summary", at: [1.08, 1.0, -0.12], turn: -0.42, scale: 1.35 },
];

export function Roles() {
  const root = useComposition("roles");
  const holders = useRef<(Group | null)[]>([]);
  useFrame(() => {
    if (!root.current?.visible) return;
    const f = frame.focus[7];
    holders.current.forEach((holder, i) => {
      if (!holder) return;
      const k = stagger(f, i, 4);
      roles.devices[i].reveal = screenReveal(k);
      const bob = story.reduced ? 0 : Math.sin(frame.time * 0.7 + i * 2) * 0.025;
      holder.position.y = ROLE_DEVICES[i].at[1] + (1 - k) * -0.45 + bob;
    });
  });
  return (
    <group ref={root} userData={{ fade: roles.fade }}>
      {ROLE_DEVICES.map(({ kind, screen, at, turn, scale }, i) => (
        <group
          key={screen}
          ref={(group) => {
            holders.current[i] = group;
          }}
          position={at}
          rotation={[0.04, turn, 0]}
          scale={scale}
        >
          <Device kind={kind} screen={screen} fade={roles.fade} state={roles.devices[i]} />
        </group>
      ))}
    </group>
  );
}

// ── Her yerde: tablet ve telefon metnin iki yanında ──

const devices = {
  fade: { value: 1 } as Fade,
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
    <group ref={root} userData={{ fade: devices.fade }}>
      <group ref={tablet} rotation={[0.05, -0.52, 0.03]}>
        <Device kind="tablet" screen="calendar" fade={devices.fade} state={devices.tablet} />
      </group>
      <group ref={phone} rotation={[0.04, 0.48, -0.04]}>
        <Device kind="phone" screen="summary" fade={devices.fade} state={devices.phone} />
      </group>
    </group>
  );
}
