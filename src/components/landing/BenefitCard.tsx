import type { LucideIcon } from "lucide-react";

export function BenefitCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="border-t border-border pt-6">
      <span className="grid size-11 place-items-center rounded-md bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
      <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}
