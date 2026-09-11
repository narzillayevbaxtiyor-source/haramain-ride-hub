import { UsersRound } from "lucide-react";
import { Counter } from "./Counter";
import { useBookingText } from "@/lib/i18n-booking";

type Props = { adults: number; children: number; onAdultsChange: (v: number) => void; onChildrenChange: (v: number) => void };

export function PassengerCounter({ adults, children, onAdultsChange, onChildrenChange }: Props) {
  const b = useBookingText();
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
        <UsersRound className="size-4" aria-hidden="true" />{b.passengersTitle}
      </p>
      <Counter label={b.adults} value={adults} onChange={onAdultsChange} min={1} max={12} />
      <Counter label={b.children} value={children} onChange={onChildrenChange} min={0} max={10} />
    </div>
  );
}
