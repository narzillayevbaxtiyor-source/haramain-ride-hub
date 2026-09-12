import type { BookingDraft, DriverOffer } from "@/lib/booking";
import { useBookingText } from "@/lib/i18n-booking";
import { useBookingLabels } from "@/lib/booking-labels";

type Props = {
  draft: BookingDraft;
  offer?: DriverOffer | null | undefined;
  compact?: boolean | undefined;
  onEdit?: (() => void) | undefined;
};

export function BookingSummary({ draft, offer, compact, onEdit }: Props) {
  const b = useBookingText();
  const labels = useBookingLabels();

  const rows: { label: string; value: string }[] = [];
  if (draft.city) rows.push({ label: b.pickupLbl, value: `${labels.city(draft.city)}${draft.pickupLocation ? ` — ${draft.pickupLocation}` : ""}` });
  if (draft.airport) rows.push({ label: b.destinationLbl, value: labels.airport(draft.airport) });
  if (draft.date) rows.push({ label: b.dateLbl, value: draft.date });
  if (draft.time) rows.push({ label: b.timeLbl, value: draft.time });
  rows.push({ label: b.passengersLbl, value: String(draft.adults + draft.children) });
  rows.push({ label: b.luggageLbl, value: String(draft.largeLuggage + draft.handLuggage) });
  if (draft.rideType) rows.push({ label: b.rideLbl, value: labels.ride(draft.rideType) });
  if (offer) {
    rows.push({ label: b.driverLbl, value: offer.driver_name ?? "—" });
    rows.push({ label: b.vehicleLbl, value: `${offer.vehicle_type}${offer.vehicle_model ? ` · ${offer.vehicle_model}` : ""}` });
  }

  return (
    <div className={`rounded-lg border border-border bg-card shadow-card ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-card-foreground">{b.trip}</h2>
        {onEdit ? (
          <button type="button" onClick={onEdit} className="text-sm font-bold text-primary hover:text-foreground">{b.changeSelection}</button>
        ) : null}
      </div>
      <dl className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-end text-sm font-semibold text-foreground">{row.value}</dd>
          </div>
        ))}
        {offer ? (
          <div className="flex items-center justify-between gap-4 pt-1">
            <dt className="text-sm font-bold text-foreground">{b.priceLbl}</dt>
            <dd className="font-display text-2xl font-bold text-primary">{labels.price(offer.price)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
