import { Check } from "lucide-react";
import { useBookingText } from "@/lib/i18n-booking";

export function BookingProgress({ step, total }: { step: number; total: number }) {
  const b = useBookingText();
  const labels = [b.stepLocation, b.stepDestination, b.stepDateTime, b.stepPeople, b.stepRide, b.stepOffers];
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {b.stepOf} {Math.min(step, total)}/{total}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{labels[Math.min(step, total) - 1]}</p>
      </div>
      <ol className="mt-3 flex items-center gap-1.5" aria-label={b.flowTitle}>
        {labels.slice(0, total).map((label, index) => {
          const position = index + 1;
          const done = position < step;
          const current = position === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-1.5">
              <span
                aria-current={current ? "step" : undefined}
                className={`grid h-1.5 w-full place-items-center rounded-full transition-colors ${
                  done || current ? "bg-primary" : "bg-border"
                }`}
              />
              {done ? <Check className="size-3 shrink-0 text-primary" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
