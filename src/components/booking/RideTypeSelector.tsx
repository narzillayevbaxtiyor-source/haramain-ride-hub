import { CarFront, Check, UsersRound } from "lucide-react";
import type { RideType } from "@/lib/booking";
import { useBookingText } from "@/lib/i18n-booking";

export function RideTypeSelector({ value, onChange }: { value: RideType | null; onChange: (ride: RideType) => void }) {
  const b = useBookingText();
  const options = [
    { key: "private" as RideType, icon: CarFront, title: b.privateRide, text: b.privateRideText },
    { key: "shared" as RideType, icon: UsersRound, title: b.sharedRide, text: b.sharedRideText },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map(({ key, icon: Icon, title, text }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={selected}
            className={`flex min-h-40 flex-col rounded-lg border p-5 text-start transition-all ${
              selected ? "border-primary bg-primary-soft shadow-card" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className={`grid size-12 place-items-center rounded-md ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <span className="mt-4 flex items-center gap-2">
              <span className="font-display text-xl font-bold text-card-foreground">{title}</span>
              {selected ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
            </span>
            <span className="mt-2 text-sm leading-6 text-muted-foreground">{text}</span>
          </button>
        );
      })}
    </div>
  );
}
