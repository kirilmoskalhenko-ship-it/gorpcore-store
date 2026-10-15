import { IntroGate } from "@/components/intro/IntroGate";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Overlays } from "@/components/layout/Overlays";
import { About } from "@/components/sections/About";
import { Catalog } from "@/components/sections/Catalog";
import { FitBuilder } from "@/components/sections/FitBuilder";
import { Hero } from "@/components/sections/Hero";
import { Lookbooks } from "@/components/sections/Lookbooks";

/** Единственная страница магазина: все разделы — компоненты одного маршрута `/`. */
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Lookbooks />
        <Catalog />
        <FitBuilder />
        <About />
      </main>
      <Footer />
      <Overlays />
      <IntroGate />
    </>
  );
}
