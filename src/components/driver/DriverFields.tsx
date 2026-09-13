import { Minus, Plus } from "lucide-react";

export function OptionButton({
  selected, label, hint, onClick,
}: { selected: boolean; label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-16 w-full flex-col justify-center rounded-md border px-4 py-3 text-start transition-colors ${
        selected ? "border-primary bg-primary-soft" : "border-input bg-card hover:bg-secondary"
      }`}
    >
      <span className="text-sm font-bold text-card-foreground">{label}</span>
      {hint ? <span className="mt-0.5 text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

export function NumberStepper({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (next: number) => void }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 rounded-md border border-input bg-card px-4 py-3">
      <span className="text-sm font-semibold text-card-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${label} −`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="grid size-11 place-items-center rounded-md border border-input text-foreground disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="w-8 text-center text-base font-bold text-card-foreground" aria-live="polite">{value}</span>
        <button
          type="button"
          aria-label={`${label} +`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function TextField({
  label, value, onChange, placeholder, hint, disabled, inputMode,
}: {
  label: string;
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  inputMode?: "text" | "tel" | "numeric";
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-card-foreground">{label}</span>
      <input
        type="text"
        inputMode={inputMode ?? "text"}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 min-h-13 w-full rounded-md border border-input bg-card px-4 text-base text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:bg-secondary disabled:text-muted-foreground"
      />
      {hint ? <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
