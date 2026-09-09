import { MapPin, MoveRight } from "lucide-react";
import heroImage from "@/assets/haramain-hero.jpg";
import { useLanguage } from "@/lib/i18n";

export function HeroSection() {
  const { t } = useLanguage();
  return (
    <section className="relative min-h-[720px] overflow-hidden bg-hero sm:min-h-[760px] lg:min-h-[780px]">
      <img src={heroImage} width={1600} height={1000} alt="Airport transfer vehicle travelling between Makkah and an airport" className="absolute inset-0 h-full w-full object-cover object-[65%_center]" fetchPriority="high" />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="relative mx-auto flex min-h-[720px] max-w-7xl items-center px-5 pb-24 pt-32 sm:min-h-[760px] sm:px-6 lg:min-h-[780px] lg:px-8">
        <div className="max-w-2xl text-start">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hero-foreground/20 bg-hero-foreground/10 px-3.5 py-2 text-xs font-bold uppercase text-hero-foreground backdrop-blur-sm sm:text-sm">
            <MapPin className="size-4" aria-hidden="true" />
            {t.eyebrow}
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.08] text-hero-foreground sm:text-6xl lg:text-7xl">{t.heroTitle}</h1>
          <p className="mt-5 max-w-xl font-display text-2xl font-semibold leading-tight text-hero-foreground sm:text-3xl">{t.heroSubtitle}</p>
          <p className="mt-5 max-w-lg text-base leading-7 text-hero-muted sm:text-lg">{t.heroBody}</p>
          <a href="#paths" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-bold text-accent-foreground shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t.choosePath}<MoveRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
