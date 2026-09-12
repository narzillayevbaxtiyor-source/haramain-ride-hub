import { SearchX } from "lucide-react";
import { useBookingText } from "@/lib/i18n-booking";

type Props = { onChangeDateTime: () => void; onChangeRideType: () => void; onEditDetails: () => void };

export function EmptyOffersState({ onChangeDateTime, onChangeRideType, onEditDetails }: Props) {
  const b = useBookingText();
  const actions = [
    { label: b.changeDateTime, action: onChangeDateTime },
    { label: b.changeRideType, action: onChangeRideType },
    { label: b.editDetails, action: onEditDetails },
  ];
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center sm:p-10">
      <span className="mx-auto grid size-12 place-items-center rounded-md bg-secondary text-primary">
        <SearchX className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-5 font-display text-xl font-bold text-card-foreground">{b.noOffers}</p>
      <p className="mt-2 text-sm text-muted-foreground">{b.noOffersText}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {actions.map(({ label, action }) => (
          <button key={label} type="button" onClick={action} className="inline-flex min-h-12 items-center justify-center rounded-md border border-input px-5 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
