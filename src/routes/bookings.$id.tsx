import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PassengerPageShell } from "@/components/booking/PassengerPageShell";
import { SignInGate } from "@/components/booking/SignInGate";
import { StatusPill, usePassengerStatusLabel } from "@/components/booking/PassengerStatus";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useBookingLabels } from "@/lib/booking-labels";
import { useMyBookingText } from "@/lib/i18n-mybookings";
import { cancelMyBooking, getMyBooking, type BookingHistoryEntry, type PassengerBooking } from "@/lib/passenger.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bookings/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Booking Details — Haramain 2 Airport" },
      { name: "description", content: "Your airport transfer details: driver, vehicle, plate number, pickup, destination, price and current status." },
      { property: "og:title", content: "Booking Details — Haramain 2 Airport" },
      { property: "og:description", content: "Driver, vehicle, pickup, destination, price and current status of your transfer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingDetails,
});

const CANCELLABLE = ["pending", "driver_accepted", "driver_arriving", "driver_arrived"];

function BookingDetails() {
  const { id } = useParams({ from: "/bookings/$id" });
  const m = useMyBookingText();
  const labels = useBookingLabels();
  const statusLabel = usePassengerStatusLabel();
  const { user, ready } = useDriverSession();
  const load = useServerFn(getMyBooking);
  const cancel = useServerFn(cancelMyBooking);

  const [booking, setBooking] = useState<PassengerBooking | null>(null);
  const [history, setHistory] = useState<BookingHistoryEntry[]>([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await load({ data: { id } });
      if (!result) {
        setMissing(true);
        return;
      }
      setBooking(result.booking);
      setHistory(result.history);
    } catch {
      setError(m.errGeneric);
    }
  }, [load, id, m.errGeneric]);

  useEffect(() => {
    if (ready && user) void refresh();
  }, [ready, user, refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`booking-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${id}` }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, id, refresh]);

  if (!ready) return <PassengerPageShell title={m.myBookings}><p className="text-sm text-muted-foreground">{m.loading}</p></PassengerPageShell>;

  if (!user) {
    return (
      <PassengerPageShell title={m.myBookings} subtitle={m.myBookingsSub}>
        <SignInGate redirectTo={`/bookings/${id}`} />
      </PassengerPageShell>
    );
  }

  if (missing) {
    return (
      <PassengerPageShell title={m.myBookings} error={m.errNotFound}>
        <Link to="/bookings" className="inline-flex min-h-12 items-center rounded-md border border-input px-5 text-sm font-bold text-foreground hover:bg-secondary">
          {m.backToBookings}
        </Link>
      </PassengerPageShell>
    );
  }

  if (!booking) {
    return <PassengerPageShell title={m.myBookings} error={error}><p className="text-sm text-muted-foreground">{m.loading}</p></PassengerPageShell>;
  }

  const rows: [string, string][] = [
    [m.bookingId, booking.id],
    [m.driverLbl, booking.driver_name ?? "—"],
    [m.vehicleLbl, `${booking.vehicle_type ?? "—"}${booking.vehicle_model ? ` · ${booking.vehicle_model}` : ""}`],
    [m.plateLbl, booking.plate_number ?? "—"],
    [m.pickupLbl, `${labels.city(booking.pickup_city)} — ${booking.pickup_location}`],
    [m.destinationLbl, labels.airport(booking.destination_airport)],
    [m.dateLbl, booking.date],
    [m.timeLbl, booking.time.slice(0, 5)],
    [m.passengersLbl, String(booking.passengers)],
    [m.luggageLbl, String(booking.luggage)],
    [m.rideLbl, labels.ride(booking.ride_type)],
    [m.priceLbl, labels.price(booking.price)],
    [m.statusLbl, statusLabel(booking.status)],
  ];

  async function handleCancel() {
    setBusy(true);
    setError(null);
    const result = await cancel({ data: { id, reason } });
    setBusy(false);
    setAsking(false);
    if (!result.ok) {
      setError(result.reason === "not_found" ? m.errNotFound : m.cancelNotAllowed);
      return;
    }
    await refresh();
  }

  const banner =
    booking.status === "driver_accepted" || booking.status === "driver_arriving" || booking.status === "driver_arrived" ? (
      <div className="rounded-md border border-primary/25 bg-primary-soft/60 p-4">
        <p className="font-display text-base font-bold text-foreground">{m.acceptedTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{m.acceptedText}</p>
      </div>
    ) : booking.status === "rejected" ? (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
        <p className="font-display text-base font-bold text-destructive">{m.rejectedTitle}</p>
        <p className="mt-1 text-sm text-foreground">{m.rejectedText}</p>
        <Link to="/passenger" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          {m.chooseAnother}
        </Link>
      </div>
    ) : null;

  return (
    <PassengerPageShell title={m.myBookings} error={error}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <StatusPill status={booking.status} />
          <Link to="/bookings" className="text-sm font-bold text-primary">{m.backToBookings}</Link>
        </div>

        {banner}

        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border bg-card px-3 py-2 shadow-card">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 break-words text-sm font-semibold text-card-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        {history.length > 0 ? (
          <section>
            <h2 className="font-display text-lg font-bold text-foreground">{m.historyTitle}</h2>
            <ol className="mt-3 space-y-2">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
                  <span className="text-sm font-semibold text-foreground">{statusLabel(entry.status)}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{new Date(entry.created_at).toLocaleString()}</span>
                  {entry.note ? <span className="w-full text-xs text-muted-foreground">{entry.note}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {CANCELLABLE.includes(booking.status) ? (
          asking ? (
            <div className="rounded-md border border-border bg-card p-4 shadow-card">
              <label className="block">
                <span className="text-sm font-semibold text-card-foreground">{m.cancelReason}</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={m.cancelReasonPlaceholder}
                  className="mt-2 min-h-13 w-full rounded-md border border-input bg-card px-4 text-base text-card-foreground"
                />
              </label>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={busy}
                  className="inline-flex min-h-13 flex-1 items-center justify-center rounded-md bg-destructive px-6 text-base font-bold text-destructive-foreground disabled:opacity-60"
                >
                  {busy ? m.loading : m.confirmCancel}
                </button>
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  className="inline-flex min-h-13 items-center justify-center rounded-md border border-input px-5 text-sm font-bold text-foreground"
                >
                  {m.keepBooking}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="inline-flex min-h-13 items-center justify-center rounded-md border border-input px-6 text-sm font-bold text-destructive hover:bg-secondary"
            >
              {m.cancelBooking}
            </button>
          )
        ) : null}
      </div>
    </PassengerPageShell>
  );
}
