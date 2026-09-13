import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PassengerPageShell } from "@/components/booking/PassengerPageShell";
import { SignInGate } from "@/components/booking/SignInGate";
import { StatusPill } from "@/components/booking/PassengerStatus";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useBookingLabels } from "@/lib/booking-labels";
import { useMyBookingText } from "@/lib/i18n-mybookings";
import { listMyBookings, type PassengerBooking } from "@/lib/passenger.functions";
import { supabase } from "@/integrations/supabase/client";
import type { BookingStatus } from "@/lib/driver.functions";

export const Route = createFileRoute("/bookings/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Bookings — Haramain 2 Airport" },
      { name: "description", content: "Track your Makkah and Madinah airport transfers: driver, vehicle, pickup, price and live trip status." },
      { property: "og:title", content: "My Bookings — Haramain 2 Airport" },
      { property: "og:description", content: "Track your airport transfers and their live status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyBookings,
});

type Tab = "upcoming" | "active" | "completed" | "cancelled";

const GROUPS: Record<Tab, BookingStatus[]> = {
  upcoming: ["pending", "driver_accepted", "driver_arriving", "driver_arrived"],
  active: ["trip_started"],
  completed: ["completed"],
  cancelled: ["cancelled", "rejected"],
};

function MyBookings() {
  const m = useMyBookingText();
  const labels = useBookingLabels();
  const { user, ready } = useDriverSession();
  const load = useServerFn(listMyBookings);

  const [tab, setTab] = useState<Tab>("upcoming");
  const [bookings, setBookings] = useState<PassengerBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBookings(await load({}));
    } catch {
      setError(m.errGeneric);
    }
  }, [load, m.errGeneric]);

  useEffect(() => {
    if (ready && user) void refresh();
  }, [ready, user, refresh]);

  // Status changes are stored in the database; this keeps the page in step with them.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("passenger-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `passenger_id=eq.${user.id}` }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  if (!ready) return <PassengerPageShell title={m.myBookings}><p className="text-sm text-muted-foreground">{m.loading}</p></PassengerPageShell>;

  if (!user) {
    return (
      <PassengerPageShell title={m.myBookings} subtitle={m.myBookingsSub}>
        <SignInGate redirectTo="/bookings" />
      </PassengerPageShell>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: m.tabUpcoming },
    { key: "active", label: m.tabActive },
    { key: "completed", label: m.tabCompleted },
    { key: "cancelled", label: m.tabCancelled },
  ];

  const visible = (bookings ?? []).filter((booking) => GROUPS[tab].includes(booking.status));

  return (
    <PassengerPageShell title={m.myBookings} subtitle={m.myBookingsSub} error={error}>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={m.myBookings}>
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-current={tab === item.key ? "page" : undefined}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${
              tab === item.key ? "bg-primary text-primary-foreground" : "border border-input text-foreground hover:bg-secondary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {bookings === null ? (
        <p className="mt-6 text-sm text-muted-foreground">{m.loading}</p>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-5 text-center shadow-card">
          <p className="font-display text-lg font-bold text-card-foreground">{m.noBookings}</p>
          <p className="mt-2 text-sm text-muted-foreground">{m.noBookingsText}</p>
          <Link
            to="/passenger"
            className="mt-5 inline-flex min-h-13 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            {m.browseOffers}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((booking) => (
            <li key={booking.id} className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-card-foreground">
                    {labels.city(booking.pickup_city)} → {labels.airport(booking.destination_airport)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {booking.date} · {booking.time.slice(0, 5)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.driverLbl}: {booking.driver_name ?? "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusPill status={booking.status} />
                  <span className="text-base font-bold text-primary">{labels.price(booking.price)}</span>
                </div>
              </div>
              <Link
                to="/bookings/$id"
                params={{ id: booking.id }}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary"
              >
                {m.viewBooking}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PassengerPageShell>
  );
}
