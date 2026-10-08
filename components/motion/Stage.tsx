"use client";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { prefersReducedMotion, startingTier, supportsWebGL } from "@/three/quality.ts";
import { story } from "@/three/story.ts";
import { ScenePoster } from "./ScenePoster.tsx";

// 3D paketi yalnız tarayıcıda ve ilk boyamadan sonra yüklenir.
const Experience = dynamic(() => import("@/three/Experience.tsx"), { ssr: false });

const INTERACTIONS = ["pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;

type Mode = "idle" | "on-demand";

const INTRO_KEY = "tutorwise-intro";

/** Açılış oturumda bir kez oynar: dil değiştirince ya da logoya basınca
 *  sayfa yeniden yüklenir ama kitap yeniden süzülerek gelmez. */
function firstVisitThisSession(): boolean {
  try {
    if (sessionStorage.getItem(INTRO_KEY)) return false;
    sessionStorage.setItem(INTRO_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

/** Sabit sahne.
 *  - Güçlü cihaz: 3D tarayıcı boşa çıkınca yüklenir; tuval belirince
 *    sinematik açılış oynar (kitap derinlikten gelir, sırt ışığı yanar).
 *    Açılış oturumda bir kez oynar.
 *  - Dokunmatik/zayıf cihaz: sahnenin poster görüntüsü hemen görünür, 3D
 *    ilk etkileşimde yüklenir ve posterle aynı pozdan devam eder (açılış
 *    oynamaz, sıçrama olmasın). Hemen çıkan biri megabaytlarca 3D indirmez.
 *  - WebGL yoksa poster kalır. */
export function Stage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [tier, setTier] = useState<"high" | "low" | null>(null);
  const [visible, setVisible] = useState(false);
  const [posterGone, setPosterGone] = useState(false);
  const [noWebGL, setNoWebGL] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const begin = () => {
      if (cancelled) return;
      if (supportsWebGL()) setTier(startingTier());
      else setNoWebGL(true);
    };
    const onDemand = window.matchMedia("(pointer: coarse)").matches || startingTier() === "low";
    if (onDemand) {
      const once = () => {
        for (const name of INTERACTIONS) window.removeEventListener(name, once);
        begin();
      };
      for (const name of INTERACTIONS) window.addEventListener(name, once, { passive: true });
      const id = setTimeout(() => setMode("on-demand"), 0);
      return () => {
        cancelled = true;
        clearTimeout(id);
        for (const name of INTERACTIONS) window.removeEventListener(name, once);
      };
    }
    const id =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(begin, { timeout: 1500 })
        : setTimeout(begin, 300);
    const modeId = setTimeout(() => setMode("idle"), 0);
    return () => {
      cancelled = true;
      clearTimeout(modeId);
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(id as number);
      clearTimeout(id as ReturnType<typeof setTimeout>);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setPosterGone(true), 1200);
    return () => clearTimeout(id);
  }, [visible]);

  const onReady = () => {
    const intro =
      mode === "idle" && !story.reduced && !prefersReducedMotion() && !story.poster && firstVisitThisSession();
    if (intro) {
      story.intro = 0;
      gsap.to(story, { intro: 1, duration: 3.2, ease: "none", delay: 0.15 });
    }
    setVisible(true);
  };

  // Poster yalnız dokunmatik/zayıf cihazda yer tutucudur; WebGL yoksa her yerde.
  const showPoster = noWebGL || (!posterGone && mode === "on-demand");
  return (
    <div className="stage" aria-hidden="true">
      {showPoster && <ScenePoster />}
      {tier && (
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <Experience tier={tier} onReady={onReady} />
        </div>
      )}
    </div>
  );
}
