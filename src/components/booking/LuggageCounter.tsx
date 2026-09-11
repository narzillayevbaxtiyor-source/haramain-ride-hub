import { Luggage } from "lucide-react";
import { Counter } from "./Counter";
import { useBookingText } from "@/lib/i18n-booking";

type Props = { large: number; hand: number; onLargeChange: (v: number) => void; onHandChange: (v: number) => void };

export function LuggageCounter({ large, hand, onLargeChange, onHandChange }: Props) {
  const b = useBookingText();
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
        <Luggage className="size-4" aria-hidden="true" />{b.luggageTitle}
      </p>
      <Counter label={b.largeSuitcases} value={large} onChange={onLargeChange} min={0} max={12} />
      <Counter label={b.handLuggage} value={hand} onChange={onHandChange} min={0} max={12} />
    </div>
  );
}
