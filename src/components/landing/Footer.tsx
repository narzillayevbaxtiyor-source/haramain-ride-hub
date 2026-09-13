import { Link } from "@tanstack/react-router";
import { Brand } from "./Header";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/lib/i18n";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-footer py-10">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8">
        <div><Brand /><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{t.footerText}</p></div>
        <div className="space-y-5 md:text-end">
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-muted-foreground md:justify-end" aria-label="Footer navigation">
            <Link to="/passenger" className="hover:text-foreground">{t.navPassenger}</Link>
            <Link to="/driver" className="hover:text-foreground">{t.navDriver}</Link>
            <Link to="/" hash="routes" className="hover:text-foreground">{t.navRoutes}</Link>
            <Link to="/faq" className="hover:text-foreground">{t.faq}</Link>
            <Link to="/contact" className="hover:text-foreground">{t.contact}</Link>
          </nav>
          <div className="inline-flex"><LanguageSelector /></div>
        </div>
      </div>
    </footer>
  );
}
