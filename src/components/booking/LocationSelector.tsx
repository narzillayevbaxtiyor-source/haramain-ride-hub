import { useState } from "react";
import { Building2, Loader2, MapPin, Search } from "lucide-react";
import type { PickupCity } from "@/lib/booking";
import { useBookingText } from "@/lib/i18n-booking";
import { useBookingLabels } from "@/lib/booking-labels";

type Props = {
  city: PickupCity | null;
  pickupLocation: string;
  onCityChange: (city: PickupCity) => void;
  onPickupChange: (value: string) => void;
};

const cities: PickupCity[] = ["makkah", "madinah"];

export function LocationSelector({ city, pickupLocation, onCityChange, onPickupChange }: Props) {
  const b = useBookingText();
  const labels = useBookingLabels();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);

  const useMyLocation = () => {
    setGeoError(false);
    if (!("geolocation" in navigator)) {
      setGeoError(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        onPickupChange(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {cities.map((option) => {
          const selected = city === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onCityChange(option)}
              aria-pressed={selected}
              className={`flex min-h-16 items-center gap-3 rounded-lg border p-4 text-start transition-all ${
                selected ? "border-primary bg-primary-soft shadow-card" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-md ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold text-card-foreground">{labels.city(option)}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{b.pickupAnywhere}</p>
        <button
          type="button"
          onClick={useMyLocation}
          className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-start transition-colors hover:border-primary/40"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary">
            {locating ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <MapPin className="size-5" aria-hidden="true" />}
          </span>
          <span>
            <span className="block text-sm font-bold text-card-foreground">{locating ? b.locating : b.useMyLocation}</span>
            <span className="block text-xs text-muted-foreground">{b.useMyLocationHint}</span>
          </span>
        </button>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <Search className="size-4 text-primary" aria-hidden="true" />{b.enterAddress}
          </span>
          <input
            type="text"
            value={pickupLocation}
            onChange={(event) => onPickupChange(event.target.value)}
            placeholder={b.addressPlaceholder}
            className="min-h-13 w-full rounded-md border border-input bg-background px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        {geoError ? <p role="alert" className="text-sm font-medium text-destructive">{b.locationError}</p> : null}

        {city && pickupLocation.trim() ? (
          <div className="rounded-md border border-primary/20 bg-primary-soft px-4 py-3">
            <p className="text-xs font-bold uppercase text-primary">{b.selectedPickup}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{labels.city(city)} — {pickupLocation}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
