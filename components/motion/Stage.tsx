"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { startingTier, supportsWebGL } from "@/three/quality.ts";
import { ScenePoster } from "./ScenePoster.tsx";

// 3D paketi yalnız tarayıcıda ve ilk boyamadan sonra yüklenir.
const Experience = dynamic(() => import("@/three/Experience.tsx"), { ssr: false });

const INTERACTIONS = ["pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;

/** Sabit sahne. Sahnenin poster görüntüsü anında görünür; 3D tuval hazır
 *  olunca üstüne yumuşakça gelir, poster sonra kaldırılır. Güçlü
 *  cihazlarda 3D tarayıcı boşa çıkınca, dokunmatik ya da zayıf cihazlarda
 *  ziyaretçi sayfayla ilk etkileşime girince yüklenir: hemen çıkan biri
 *  megabaytlarca 3D indirmez. WebGL yoksa poster kalır. */
export function Stage() {
  const [tier, setTier] = useState<"high" | "low" | null>(null);
  const [visible, setVisible] = useState(false);
  const [posterGone, setPosterGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const begin = () => {
      if (!cancelled && supportsWebGL()) setTier(startingTier());
    };
    const onDemand = window.matchMedia("(pointer: coarse)").matches || startingTier() === "low";
    if (onDemand) {
      const once = () => {
        for (const name of INTERACTIONS) window.removeEventListener(name, once);
        begin();
      };
      for (const name of INTERACTIONS) window.addEventListener(name, once, { passive: true });
      return () => {
        cancelled = true;
        for (const name of INTERACTIONS) window.removeEventListener(name, once);
      };
    }
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(begin, { timeout: 1500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const id = setTimeout(begin, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setPosterGone(true), 1800);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <div className="stage" aria-hidden="true">
      {!posterGone && <ScenePoster />}
      {tier && (
        <div
          className="absolute inset-0 transition-opacity duration-[1600ms] ease-out"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <Experience tier={tier} onReady={() => setVisible(true)} />
        </div>
      )}
    </div>
  );
}
