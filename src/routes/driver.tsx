import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Wallet } from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { useDriverText } from "@/lib/i18n-driver";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Join as a Driver — Haramain 2 Airport" },
      { name: "description", content: "Register as an airport transfer driver in Makkah and Madinah, set your own prices and receive airport transfer bookings." },
      { property: "og:title", content: "Join as a Driver — Haramain 2 Airport" },
      { property: "og:description", content: "Set your own prices and receive airport transfer bookings from Makkah and Madinah." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/driver" }],
  }),
  component: DriverLanding,
});

function DriverLanding() {
  const d = useDriverText();
  const perks = [
    { icon: Wallet, title: d.perkPrice, text: d.perkPriceText },
    { icon: MapPin, title: d.perkRoutes, text: d.perkRoutesText },
    { icon: BadgeCheck, title: d.perkFast, text: d.perkFastText },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-26 sm:px-6 sm:pt-32">
        <section className="rounded-lg border border-border bg-card p-6 shadow-card sm:p-10">
          <h1 className="font-display text-3xl font-bold text-card-foreground sm:text-4xl">{d.joinTitle}</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{d.joinBody}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              to="/driver/register"
              className="inline-flex min-h-14 items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {d.register}
            </Link>
            <Link
              to="/driver/login"
              className="inline-flex min-h-14 items-center justify-center rounded-md border border-input px-6 text-base font-bold text-foreground transition-colors hover:bg-secondary"
            >
              {d.login}
            </Link>
          </div>
        </section>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {perks.map((perk) => (
            <li key={perk.title} className="rounded-lg border border-border bg-card p-5 shadow-card">
              <span className="grid size-10 place-items-center rounded-md bg-primary-soft text-primary">
                <perk.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-sm font-bold text-card-foreground">{perk.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{perk.text}</p>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
