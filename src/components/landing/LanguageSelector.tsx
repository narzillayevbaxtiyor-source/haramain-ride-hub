import { Languages } from "lucide-react";
import { useLanguage, type Language } from "@/lib/i18n";

const options: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "uz", label: "Uzbek" },
  { value: "ru", label: "Русский" },
  { value: "ar", label: "العربية" },
];


export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <label className="relative flex items-center gap-2 text-sm font-semibold text-foreground">
      <Languages aria-hidden="true" className="size-4 text-primary" />
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="appearance-none bg-transparent py-2 pe-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
