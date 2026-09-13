import { Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/lib/i18n";

export function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Haramain 2 Airport home">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
        <Plane className="size-4 -rotate-45" aria-hidden="true" />
      </span>
      <span className="truncate font-display text-base font-bold text-foreground sm:text-lg">Haramain <span className="text-primary">2</span> Airport</span>
    </Link>
  );
}

const navLinkClass = "shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function Header() {
  const { t } = useLanguage();
  return (
    <header className="absolute inset-x-0 top-0 z-30 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:h-20 sm:py-0 sm:px-6 lg:px-8">
        <Brand />
        <div className="flex items-center gap-5">
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
            <Link to="/passenger" className={navLinkClass}>{t.navPassenger}</Link>
            <Link to="/driver" className={navLinkClass}>{t.navDriver}</Link>
            <Link to="/" hash="routes" className={navLinkClass}>{t.navRoutes}</Link>
          </nav>
          <LanguageSelector compact />
        </div>
        <nav className="col-span-2 -mx-1 flex items-center gap-5 overflow-x-auto px-1 pb-0.5 md:hidden" aria-label="Primary navigation">
          <Link to="/passenger" className={navLinkClass}>{t.navPassenger}</Link>
          <Link to="/driver" className={navLinkClass}>{t.navDriver}</Link>
          <Link to="/" hash="routes" className={navLinkClass}>{t.navRoutes}</Link>
          <Link to="/faq" className={navLinkClass}>{t.faq}</Link>
          <Link to="/contact" className={navLinkClass}>{t.contact}</Link>
        </nav>
      </div>
    </header>
  );
}
