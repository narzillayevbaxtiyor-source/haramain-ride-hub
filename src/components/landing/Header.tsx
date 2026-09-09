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

export function Header() {
  const { t } = useLanguage();
  return (
    <header className="absolute inset-x-0 top-0 z-30 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid h-18 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Brand />
        <div className="flex items-center gap-5">
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
            <a href="#paths" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t.navPassenger}</a>
            <a href="#paths" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t.navDriver}</a>
            <a href="#routes" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t.navRoutes}</a>
          </nav>
          <LanguageSelector compact />
        </div>
      </div>
    </header>
  );
}
