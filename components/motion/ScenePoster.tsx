"use client";
import { useEffect, useState } from "react";
import { scenes, type Scene } from "@/three/choreography.ts";
import { story } from "@/three/story.ts";

/** 3D sahnenin sabit görüntüsü (public/poster): telefonda tuval hazır olana
 *  kadar yer tutucu, WebGL yoksa sahnenin kendisi. Hangi sahnenin
 *  gösterileceği 3D ile aynı kaynaktan, ScrollDriver'ın kaydırmadan
 *  hesapladığı beat'ten okunur. */
export function ScenePoster() {
  const [scene, setScene] = useState<Scene>(scenes[0]);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    let frame = 0;
    // ScrollDriver beat'i aynı kaydırma olayında günceller; bir kare sonra okunur.
    const update = () => {
      frame = 0;
      setNarrow(media.matches);
      setScene(scenes[Math.min(scenes.length - 1, Math.max(0, Math.floor(story.target)))]);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    media.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      media.removeEventListener("change", schedule);
    };
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- statik çıktıda next/image iyileştirmesi yok; süs görseli
    <img
      key={`${narrow ? "narrow" : "wide"}-${scene}`}
      src={`/poster/${narrow ? "narrow" : "wide"}-${scene}.webp`}
      alt=""
      decoding="async"
      className="absolute inset-0 size-full animate-[poster-in_0.7s_ease-out] object-cover"
    />
  );
}
