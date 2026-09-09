import { MapPin, Plane, ArrowRight } from "lucide-react";

export function RouteCard({ from, to }: { from: string; to: string }) {
  return (
    <article className="group flex min-w-[268px] flex-1 items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-card-hover sm:min-w-0">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Plane className="size-5 -rotate-45" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><MapPin className="size-3.5" />{from}</div>
        <div className="mt-1 flex items-center gap-2 font-display text-base font-bold text-card-foreground"><ArrowRight className="size-4 shrink-0 text-accent rtl:rotate-180" /> <span>{to}</span></div>
      </div>
    </article>
  );
}
