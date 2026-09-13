import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { usePagesText } from "@/lib/i18n-pages";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ | Haramain 2 Airport Transfers" },
      { name: "description", content: "Answers about airport transfers from Makkah and Madinah: routes, booking steps, private and shared rides, prices and driver registration." },
      { property: "og:title", content: "FAQ | Haramain 2 Airport Transfers" },
      { property: "og:description", content: "Answers about routes, booking steps, private and shared rides, prices and driver registration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const p = usePagesText();
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-26 sm:px-6 sm:pt-32">
        <span className="grid size-11 place-items-center rounded-md bg-primary-soft text-primary"><HelpCircle className="size-5" aria-hidden="true" /></span>
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground sm:text-4xl">{p.faqTitle}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{p.faqSubtitle}</p>
        <dl className="mt-9 space-y-4">
          {p.faqItems.map((item) => (
            <div key={item.q} className="rounded-lg border border-border bg-card p-5 shadow-card">
              <dt className="font-display text-base font-bold text-card-foreground">{item.q}</dt>
              <dd className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </main>
      <Footer />
    </div>
  );
}
