import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock3 } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useLanguage } from "@/lib/i18n";

export function ComingSoonPage({ type }: { type: "passenger" | "driver" }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex min-h-[75vh] max-w-3xl items-center px-5 pb-16 pt-32 sm:px-6">
        <div className="w-full border-t-4 border-primary bg-card p-7 shadow-card sm:p-12">
          <span className="grid size-12 place-items-center rounded-md bg-primary-soft text-primary"><Clock3 className="size-6" /></span>
          <p className="mt-7 text-sm font-bold uppercase text-primary">{t.comingSoon}</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-foreground">{type === "passenger" ? t.passenger : t.driver}</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">{type === "passenger" ? t.placeholderPassenger : t.placeholderDriver}</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 font-bold text-primary hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" />{t.backHome}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
