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
            <a href="#paths" className="hover:text-foreground">{t.navPassenger}</a><a href="#paths" className="hover:text-foreground">{t.navDriver}</a><a href="#routes" className="hover:text-foreground">{t.navRoutes}</a><span>{t.faq}</span><span>{t.contact}</span>
          </nav>
          <div className="inline-flex"><LanguageSelector /></div>
        </div>
      </div>
    </footer>
  );
}
