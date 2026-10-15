import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { TopoLines } from "@/components/ui/TopoLines";
import { siteConfig } from "@/config/site-config";

export function About() {
  const a = siteConfig.about;
  return (
    <section id="about" className="relative overflow-hidden py-24 md:py-36" aria-labelledby="about-title">
      <div className="px-gutter grid items-center gap-12 md:grid-cols-2 md:gap-20">
        <Reveal className="relative aspect-[3/4] overflow-hidden bg-surface">
          <Image src={a.image.src} alt={a.image.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
        </Reveal>
        <div className="relative">
          <TopoLines className="absolute -right-1/3 -top-1/4 w-[640px] opacity-30" rings={7} />
          <Reveal>
            <p className="eyebrow mb-5">{a.eyebrow}</p>
            <h2 id="about-title" className="display text-[clamp(2.4rem,6vw,5.5rem)]">
              {a.title}
            </h2>
            <div className="mt-8 max-w-lg space-y-5 text-[16px] leading-relaxed text-ink/85">
              {a.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <dl className="mt-12 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
              {a.facts.map((f) => (
                <div key={f.label}>
                  <dt className="eyebrow">{f.label}</dt>
                  <dd className="mt-2 text-[14px]">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
