import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PassengerBookingLayout } from "@/components/booking/PassengerBookingLayout";
import { LocationSelector } from "@/components/booking/LocationSelector";
import { AirportSelector } from "@/components/booking/AirportSelector";
import { DateTimeSelector } from "@/components/booking/DateTimeSelector";
import { PassengerCounter } from "@/components/booking/PassengerCounter";
import { LuggageCounter } from "@/components/booking/LuggageCounter";
import { RideTypeSelector } from "@/components/booking/RideTypeSelector";
import { HotOffersSection } from "@/components/booking/HotOffersSection";
import { OfferFilters, type OfferSort } from "@/components/booking/OfferFilters";
import { DriverOfferCard } from "@/components/booking/DriverOfferCard";
import { EmptyOffersState } from "@/components/booking/EmptyOffersState";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { SignInGate } from "@/components/booking/SignInGate";
import { useDriverSession } from "@/hooks/useDriverSession";
import { createPassengerBooking } from "@/lib/passenger.functions";
import { emptyDraft, fetchMatchingOffers, type BookingDraft, type DriverOffer, type RideType, type VehicleClass } from "@/lib/booking";
import { useBookingText } from "@/lib/i18n-booking";
import { useMyBookingText } from "@/lib/i18n-mybookings";

export const Route = createFileRoute("/passenger")({
  head: () => ({
    meta: [
      { title: "Book an Airport Transfer — Haramain 2 Airport" },
      { name: "description", content: "Book a private or shared airport transfer from Makkah or Madinah to Jeddah, Madinah or Taif airport in a few simple steps." },
      { property: "og:title", content: "Book an Airport Transfer — Haramain 2 Airport" },
      { property: "og:description", content: "Book a private or shared airport transfer from Makkah or Madinah to Jeddah, Madinah or Taif airport in a few simple steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/passenger" }],
  }),
  component: PassengerFlow,
});

const TOTAL_STEPS = 6;

function PassengerFlow() {
  const b = useBookingText();
  const m = useMyBookingText();
  const { user, ready } = useDriverSession();
  const submitBooking = useServerFn(createPassengerBooking);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DriverOffer | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [sort, setSort] = useState<OfferSort>("cheapest");
  const [rideFilter, setRideFilter] = useState<RideType | "all">("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [classFilter, setClassFilter] = useState<VehicleClass | "all">("all");
  const [contactPhone, setContactPhone] = useState("");

  const patch = (values: Partial<BookingDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...values }));
  };

  const offersQuery = useQuery({
    queryKey: ["offers", draft.city, draft.airport, draft.date, draft.time, draft.rideType, draft.adults + draft.children, draft.largeLuggage + draft.handLuggage],
    queryFn: () => fetchMatchingOffers(draft),
    enabled: step >= 6 && Boolean(draft.city && draft.airport && draft.date && draft.time && draft.rideType),
  });

  const bookingErrors: Record<string, string> = {
    offer_unavailable: m.errOfferUnavailable,
    driver_unavailable: m.errDriverUnavailable,
    duplicate_booking: m.errDuplicate,
    booking_conflict: m.errConflict,
    capacity: m.errCapacity,
    need_phone: b.needPhone,
    invalid: b.bookingError,
    failed: b.bookingError,
  };

  const bookingMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("offer_unavailable");
      return submitBooking({
        data: {
          offerId: selected.id,
          pickupLocation: draft.pickupLocation,
          date: draft.date,
          time: draft.time,
          adults: draft.adults,
          children: draft.children,
          largeLuggage: draft.largeLuggage,
          handLuggage: draft.handLuggage,
          contactPhone,
        },
      });
    },
    onSuccess: (result) => {
      if (result.ok) {
        setError(null);
        setBookingId(result.bookingId);
        return;
      }
      setError(bookingErrors[result.reason] ?? b.bookingError);
      // The offer or driver is no longer bookable: send the passenger back to the live list.
      if (result.reason === "offer_unavailable" || result.reason === "driver_unavailable" || result.reason === "booking_conflict") {
        setSelected(null);
        setStep(6);
        void offersQuery.refetch();
      }
    },
    onError: () => setError(b.bookingError),
  });

  const offers = offersQuery.data ?? [];
  const hotOffers = useMemo(() => [...offers].sort((a, c) => a.price - c.price).slice(0, 5), [offers]);
  const vehicleTypes = useMemo(() => Array.from(new Set(offers.map((offer) => offer.vehicle_type))), [offers]);
  const visibleOffers = useMemo(() => {
    const filtered = offers.filter(
      (offer) =>
        (rideFilter === "all" || offer.ride_type === rideFilter) &&
        (vehicleFilter === "all" || offer.vehicle_type === vehicleFilter) &&
        (classFilter === "all" || offer.vehicle_class === classFilter),
    );
    return filtered.sort((a, c) => (sort === "cheapest" ? a.price - c.price : (Number(c.rating ?? 0) - Number(a.rating ?? 0))));
  }, [offers, rideFilter, vehicleFilter, classFilter, sort]);

  const validate = (current: number): string | null => {
    if (current === 1) {
      if (!draft.city) return b.needCity;
      if (!draft.pickupLocation.trim()) return b.needPickup;
    }
    if (current === 2 && !draft.airport) return b.needAirport;
    if (current === 3) {
      if (!draft.date) return b.needDate;
      if (!draft.time) return b.needTime;
      if (new Date(`${draft.date}T${draft.time}`) < new Date()) return b.needFuture;
    }
    if (current === 4 && draft.adults + draft.children < 1) return b.needPassengers;
    if (current === 5 && !draft.rideType) return b.needRide;
    return null;
  };

  const goNext = () => {
    const message = validate(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((value) => value + 1);
  };
  const goBack = () => {
    setError(null);
    setStep((value) => Math.max(1, value - 1));
  };
  const jumpTo = (target: number) => {
    setError(null);
    setSelected(null);
    setStep(target);
  };

  const progressStep = Math.min(step, TOTAL_STEPS);
  const summary = <BookingSummary draft={draft} offer={step >= 7 ? selected : null} compact onEdit={step > 1 ? () => jumpTo(1) : undefined} />;

  if (bookingId) {
    return (
      <PassengerBookingLayout step={TOTAL_STEPS} total={TOTAL_STEPS} title={m.requestSent} subtitle={m.requestSentText} hideNav aside={summary}>
        <div className="space-y-6">
          <span className="grid size-14 place-items-center rounded-md bg-primary-soft text-primary"><CheckCircle2 className="size-7" aria-hidden="true" /></span>
          <div className="rounded-md border border-border bg-secondary px-4 py-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">{b.bookingRef}</p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground" dir="ltr">{bookingId}</p>
            <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">{m.currentStatus}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{m.sPending}</p>
          </div>
          <BookingSummary draft={draft} offer={selected} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/bookings/$id"
              params={{ id: bookingId }}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              {m.viewBooking}
            </Link>
            <button
              type="button"
              onClick={() => { setBookingId(null); setSelected(null); setDraft(emptyDraft); setStep(1); }}
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-input px-6 text-sm font-bold text-foreground hover:bg-secondary"
            >
              {b.newBooking}
            </button>
          </div>
        </div>
      </PassengerBookingLayout>
    );
  }

  if (step === 7 && selected) {
    const signedIn = ready && Boolean(user);
    return (
      <PassengerBookingLayout
        step={TOTAL_STEPS}
        total={TOTAL_STEPS}
        title={b.confirmTitle}
        error={error}
        onBack={() => { setSelected(null); setStep(6); }}
        onContinue={
          signedIn
            ? () => {
                if (!/^\+?\d{8,15}$/.test(contactPhone.replace(/[^\d+]/g, ""))) {
                  setError(b.needPhone);
                  return;
                }
                setError(null);
                bookingMutation.mutate();
              }
            : undefined
        }
        continueLabel={bookingMutation.isPending ? b.saving : b.confirmBooking}
        continueDisabled={bookingMutation.isPending}
        aside={summary}
      >
        <div className="space-y-6">
          <BookingSummary draft={draft} offer={selected} />
          {signedIn ? (
            <div className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
              <h2 className="font-display text-base font-bold text-card-foreground">{b.contactTitle}</h2>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">{b.phoneLabel}</span>
                <input
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  value={contactPhone}
                  onChange={(event) => { setError(null); setContactPhone(event.target.value); }}
                  placeholder={b.phonePlaceholder}
                  className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
          ) : null}
          {ready && !user ? <SignInGate redirectTo="/passenger" /> : null}
        </div>
      </PassengerBookingLayout>
    );
  }

  const titles = [
    { title: b.q1, subtitle: b.q1Sub },
    { title: b.q2, subtitle: b.q2Sub },
    { title: b.q3, subtitle: b.q3Sub },
    { title: b.q4, subtitle: b.q4Sub },
    { title: b.q5, subtitle: b.q5Sub },
    { title: b.q6, subtitle: b.q6Sub },
  ][progressStep - 1] ?? { title: b.q1, subtitle: b.q1Sub };

  return (
    <PassengerBookingLayout
      step={progressStep}
      total={TOTAL_STEPS}
      title={titles.title}
      subtitle={titles.subtitle}
      error={error}
      onBack={step > 1 ? goBack : undefined}
      onContinue={step < 6 ? goNext : undefined}
      hideNav={step === 6}
      aside={step > 1 ? summary : undefined}
    >
      {step === 1 ? (
        <LocationSelector
          city={draft.city}
          pickupLocation={draft.pickupLocation}
          onCityChange={(city) => patch({ city })}
          onPickupChange={(pickupLocation) => patch({ pickupLocation })}
        />
      ) : null}

      {step === 2 ? <AirportSelector value={draft.airport} onChange={(airport) => patch({ airport })} /> : null}

      {step === 3 ? (
        <DateTimeSelector date={draft.date} time={draft.time} onDateChange={(date) => patch({ date })} onTimeChange={(time) => patch({ time })} />
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <PassengerCounter
            adults={draft.adults}
            children={draft.children}
            onAdultsChange={(adults) => patch({ adults })}
            onChildrenChange={(children) => patch({ children })}
          />
          <LuggageCounter
            large={draft.largeLuggage}
            hand={draft.handLuggage}
            onLargeChange={(largeLuggage) => patch({ largeLuggage })}
            onHandChange={(handLuggage) => patch({ handLuggage })}
          />
        </div>
      ) : null}

      {step === 5 ? <RideTypeSelector value={draft.rideType} onChange={(rideType) => patch({ rideType })} /> : null}

      {step === 6 ? (
        <div className="space-y-6">
          <button type="button" onClick={goBack} className="inline-flex min-h-11 items-center rounded-md border border-input px-4 text-sm font-bold text-foreground hover:bg-secondary">
            {b.back}
          </button>

          {offersQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />{b.loadingOffers}</p>
          ) : offersQuery.isError ? (
            <p role="alert" className="text-sm font-medium text-destructive">{b.offersError}</p>
          ) : offers.length === 0 ? (
            <EmptyOffersState onChangeDateTime={() => jumpTo(3)} onChangeRideType={() => jumpTo(5)} onEditDetails={() => jumpTo(1)} />
          ) : (
            <>
              <HotOffersSection offers={hotOffers} onSelect={(offer) => { setSelected(offer); setStep(7); }} />
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground">{b.allOffers}</h2>
                <OfferFilters
                  sort={sort}
                  onSortChange={setSort}
                  ride={rideFilter}
                  onRideChange={setRideFilter}
                  vehicle={vehicleFilter}
                  onVehicleChange={setVehicleFilter}
                  vehicleTypes={vehicleTypes}
                  vehicleClass={classFilter}
                  onVehicleClassChange={setClassFilter}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleOffers.map((offer) => (
                    <DriverOfferCard key={offer.id} offer={offer} onSelect={(value) => { setSelected(value); setStep(7); }} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </PassengerBookingLayout>
  );
}
