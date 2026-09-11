import { Luggage, MapPin, Plane, Star, UsersRound } from "lucide-react";
import type { DriverOffer } from "@/lib/booking";
import { useBookingText } from "@/lib/i18n-booking";
import { useBookingLabels } from "@/lib/booking-labels";

export function DriverOfferCard({ offer, onSelect, highlighted }: { offer: DriverOffer; onSelect: (offer: DriverOffer) => void; highlighted?: boolean }) {
  const b = useBookingText();
  const labels = useBookingLabels();
  const initial = (offer.driver_name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <article className={`flex flex-col rounded-lg border bg-card p-4 shadow-card transition-all hover:shadow-card-hover sm:p-5 ${highlighted ? "border-primary/40" : "border-border"}`}>
      <div className="flex items-start gap-3">
        {offer.driver_avatar_url ? (
          <img src={offer.driver_avatar_url} alt="" width={48} height={48} loading="lazy" className="size-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary font-display text-lg font-bold text-primary">{initial}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-card-foreground">{offer.driver_name ?? "—"}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            {offer.rating !== null ? (
              <>
                <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
                <span className="font-semibold text-foreground">{Number(offer.rating).toFixed(1)}</span>
              </>
            ) : (
              <span>{b.ratingNew}</span>
            )}
          </p>
        </div>
        <p className="whitespace-nowrap font-display text-xl font-bold text-primary">{labels.price(offer.price)}</p>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{offer.vehicle_type}{offer.vehicle_model ? ` · ${offer.vehicle_model}` : ""}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5"><UsersRound className="size-4" aria-hidden="true" />{offer.seats} {b.seats}</span>
          <span className="flex items-center gap-1.5"><Luggage className="size-4" aria-hidden="true" />{offer.luggage_capacity} {b.luggageUnit}</span>
        </p>
        <p className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{labels.city(offer.pickup_city)}{offer.pickup_location ? ` · ${offer.pickup_location}` : ""}</p>
        <p className="flex items-center gap-1.5"><Plane className="size-4 -rotate-45" aria-hidden="true" />{labels.airport(offer.destination_airport)}</p>
        <p dir="ltr" className="text-foreground">{offer.date} · {offer.time.slice(0, 5)}</p>
      </div>

      <span className="mt-3 inline-flex w-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{labels.ride(offer.ride_type)}</span>

      <button
        type="button"
        onClick={() => onSelect(offer)}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {b.selectDriver}
      </button>
    </article>
  );
}
