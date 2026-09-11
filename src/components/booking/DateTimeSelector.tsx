import { CalendarDays, Clock3 } from "lucide-react";
import { useBookingText } from "@/lib/i18n-booking";

type Props = { date: string; time: string; onDateChange: (value: string) => void; onTimeChange: (value: string) => void };

export function DateTimeSelector({ date, time, onDateChange, onTimeChange }: Props) {
  const b = useBookingText();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />{b.dateLabel}
          </span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(event) => onDateChange(event.target.value)}
            className="min-h-13 w-full rounded-md border border-input bg-background px-4 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />{b.timeLabel}
          </span>
          <input
            type="time"
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
            className="min-h-13 w-full rounded-md border border-input bg-background px-4 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      {date && time ? (
        <div className="rounded-md border border-primary/20 bg-primary-soft px-4 py-3">
          <p className="text-xs font-bold uppercase text-primary">{b.selectedWhen}</p>
          <p className="mt-1 text-sm font-semibold text-foreground" dir="ltr">{date} · {time}</p>
        </div>
      ) : null}
    </div>
  );
}
