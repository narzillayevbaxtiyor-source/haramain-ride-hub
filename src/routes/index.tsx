import { createFileRoute } from "@tanstack/react-router";
import { CarFront, HandCoins, MousePointerClick, ShieldCheck, UsersRound } from "lucide-react";
import passengerImage from "@/assets/passenger-sticker.png";
import driverImage from "@/assets/driver-sticker.png";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { UserTypeCard } from "@/components/landing/UserTypeCard";
import { RouteCard } from "@/components/landing/RouteCard";
import { BenefitCard } from "@/components/landing/BenefitCard";
import { Footer } from "@/components/landing/Footer";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Haramain 2 Airport | Makkah & Madinah Airport Transfers" },
      { name: "description", content: "Book airport transfers from Makkah and Madinah to Jeddah, Madinah and Taif airports. Choose private or shared transportation with local drivers." },
      { property: "og:title", content: "Haramain 2 Airport | Makkah & Madinah Airport Transfers" },
      { property: "og:description", content: "Book airport transfers from Makkah and Madinah to Jeddah, Madinah and Taif airports. Choose private or shared transportation with local drivers." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const { t } = useLanguage();
  const routes: { from: string; to: string }[] = [
    { from: t.makkah, to: t.jeddahAirport }, { from: t.makkah, to: t.madinahAirport }, { from: t.makkah, to: t.taifAirport },
    { from: t.madinah, to: t.jeddahAirport }, { from: t.madinah, to: t.taifAirport },
  ];
  const benefits = [
    { icon: MousePointerClick, title: t.easy, text: t.easyText },
    { icon: ShieldCheck, title: t.chooseDriver, text: t.chooseDriverText },
    { icon: UsersRound, title: t.rideTypes, text: t.rideTypesText },
    { icon: HandCoins, title: t.prices, text: t.pricesText },
  ];
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Header />
      <main>
        <HeroSection />
        <section id="paths" className="relative z-10 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mb-7 text-center sm:mb-10">
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{t.choosePath}</h2>
              <p className="mt-3 text-muted-foreground">{t.choosePathBody}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <UserTypeCard title={t.passenger} text={t.passengerText} action={t.continue} to="/passenger" image={passengerImage} imageAlt="Traveler with luggage beside an airport transfer vehicle" tone="passenger" />
              <UserTypeCard title={t.driver} text={t.driverText} action={t.continue} to="/driver" image={driverImage} imageAlt="Professional driver beside an airport transfer car" tone="driver" />
            </div>
          </div>
        </section>

        <section id="routes" className="bg-section py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="mb-4 grid size-11 place-items-center rounded-md bg-primary text-primary-foreground"><CarFront className="size-5" aria-hidden="true" /></span>
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{t.popular}</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{t.popularBody}</p>
            </div>
            <div className="mt-9 flex snap-x gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
              {routes.map(({ from, to }) => <RouteCard key={`${from}-${to}`} from={from} to={to} />)}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{t.why}</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{t.whyBody}</p>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => <BenefitCard key={benefit.title} {...benefit} />)}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
