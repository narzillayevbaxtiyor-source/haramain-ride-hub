import { Check, Plane } from "lucide-react";
import type { Airport } from "@/lib/booking";
import { useBookingLabels } from "@/lib/booking-labels";

const airports: Airport[] = ["jeddah", "madinah", "taif"];

export function AirportSelector({ value, onChange }: { value: Airport | null; onChange: (airport: Airport) => void }) {
  const labels = useBookingLabels();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {airports.map((airport) => {
        const selected = value === airport;
        return (
          <button
            key={airport}
            type="button"
            onClick={() => onChange(airport)}
            aria-pressed={selected}
            className={`flex min-h-20 items-center gap-3 rounded-lg border p-4 text-start transition-all sm:flex-col sm:items-start ${
              selected ? "border-primary bg-primary-soft shadow-card" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className={`grid size-10 shrink-0 place-items-center rounded-md ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
              <Plane className="size-5 -rotate-45" aria-hidden="true" />
            </span>
            <span className="flex flex-1 items-center justify-between gap-2 sm:w-full">
              <span className="font-semibold text-card-foreground">{labels.airport(airport)}</span>
              {selected ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
