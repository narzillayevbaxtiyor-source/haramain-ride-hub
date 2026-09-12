import { Flame } from "lucide-react";
import type { DriverOffer } from "@/lib/booking";
import { DriverOfferCard } from "./DriverOfferCard";
import { useBookingText } from "@/lib/i18n-booking";

export function HotOffersSection({ offers, onSelect }: { offers: DriverOffer[]; onSelect: (offer: DriverOffer) => void }) {
  const b = useBookingText();
  if (offers.length === 0) return null;
  return (
    <section className="rounded-lg border border-primary/25 bg-primary-soft/60 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Flame className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{b.hotOffers}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{b.hotOffersText}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {offers.map((offer) => <DriverOfferCard key={offer.id} offer={offer} onSelect={onSelect} highlighted />)}
      </div>
    </section>
  );
}
