import { About } from "@/components/sections/About.tsx";
import { Audiences } from "@/components/sections/Audiences.tsx";
import { Chapters } from "@/components/sections/Chapters.tsx";
import { Everywhere } from "@/components/sections/Everywhere.tsx";
import { FinalCta } from "@/components/sections/FinalCta.tsx";
import { Hero } from "@/components/sections/Hero.tsx";
import { Footer } from "@/components/site/Footer.tsx";
import { Header } from "@/components/site/Header.tsx";
import { Reveal } from "@/components/motion/Reveal.tsx";
import { ScrollDriver } from "@/components/motion/ScrollDriver.tsx";
import { SmoothScroll } from "@/components/motion/SmoothScroll.tsx";
import { Stage } from "@/components/motion/Stage.tsx";

export default function Home() {
  return (
    <>
      <Stage />
      <SmoothScroll />
      <ScrollDriver />
      <Reveal />
      <Header />
      <main id="main" className="relative z-10">
        <Hero />
        <About />
        <Chapters />
        <Audiences />
        <Everywhere />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
