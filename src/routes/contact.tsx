import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { usePagesText } from "@/lib/i18n-pages";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Haramain 2 Airport Transfers" },
      { name: "description", content: "Get in touch about airport transfers from Makkah and Madinah, route availability or joining the platform as a driver." },
      { property: "og:title", content: "Contact | Haramain 2 Airport Transfers" },
      { property: "og:description", content: "Get in touch about airport transfers, routes or joining as a driver." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const p = usePagesText();
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-26 sm:px-6 sm:pt-32">
        <span className="grid size-11 place-items-center rounded-md bg-primary-soft text-primary"><Mail className="size-5" aria-hidden="true" /></span>
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground sm:text-4xl">{p.contactTitle}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{p.contactSubtitle}</p>
        <p className="mt-6 rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground shadow-card">{p.contactPending}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link to="/passenger" className="flex min-h-13 items-center justify-between gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground">
            {p.contactPassenger}<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link to="/driver" className="flex min-h-13 items-center justify-between gap-2 rounded-md border border-border bg-card px-5 text-sm font-bold text-card-foreground">
            {p.contactDriver}<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
