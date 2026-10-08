"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";
import { prefersReducedMotion } from "@/three/quality.ts";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/** Alt bilginin dibinde sayfa genişliğinde dev "Tutorwise" yazısı. Süs
 *  amaçlıdır (marka adı logoda zaten okunur): ekran okuyucudan gizli.
 *  Görünüme girince harfler sırayla aşağıdan yükselir. */
export function Wordmark({ text }: Readonly<{ text: string }>) {
  const el = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!el.current || prefersReducedMotion()) return;
      SplitText.create(el.current, {
        type: "chars",
        mask: "chars",
        aria: "none",
        onSplit: (self) =>
          gsap.from(self.chars, {
            yPercent: 105,
            duration: 1.4,
            ease: "expo.out",
            stagger: 0.05,
            scrollTrigger: { trigger: el.current, start: "top 95%", once: true },
          }),
      });
    },
    { scope: el },
  );
  return (
    <div ref={el} aria-hidden="true" className="wordmark select-none">
      {text}
    </div>
  );
}
