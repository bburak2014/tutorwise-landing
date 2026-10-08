"use client";
import { useEffect, useState } from "react";
import { scenes, type Scene } from "@/three/choreography.ts";

/** 3D sahnenin sabit görüntüsü (public/poster): tuval hazır olana kadar yer
 *  tutucu, WebGL yoksa sahnenin kendisi. Görünüm alanının ortasındaki
 *  bölümün görüntüsü gösterilir. */
export function ScenePoster() {
  const [scene, setScene] = useState<Scene>(scenes[0]);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onMedia = () => setNarrow(media.matches);
    onMedia();
    media.addEventListener("change", onMedia);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setScene((entry.target as HTMLElement).dataset.scene as Scene);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    document.querySelectorAll("[data-scene]").forEach((el) => {
      if (el.getClientRects().length > 0) observer.observe(el);
    });
    return () => {
      media.removeEventListener("change", onMedia);
      observer.disconnect();
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
