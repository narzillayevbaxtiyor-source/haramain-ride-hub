import { Minus, Plus } from "lucide-react";

type CounterProps = { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number };

export function Counter({ label, value, onChange, min = 0, max = 12 }: CounterProps) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-sm font-semibold text-card-foreground">{label}</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${label} -`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="grid size-11 place-items-center rounded-md border border-input text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <output className="w-7 text-center font-display text-lg font-bold text-foreground">{value}</output>
        <button
          type="button"
          aria-label={`${label} +`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
