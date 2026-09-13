import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useBookingLabels } from "@/lib/booking-labels";
import { useDashboardText, type DashboardText } from "@/lib/i18n-dashboard";
import type { BookingStatus, DriverBooking } from "@/lib/driver.functions";

export function useStatusLabel() {
  const t = useDashboardText();
  const map: Record<BookingStatus, string> = {
    pending: t.stPending,
    driver_accepted: t.stAccepted,
    driver_arriving: t.stArriving,
    driver_arrived: t.stArrived,
    trip_started: t.stStarted,
    completed: t.stCompleted,
    cancelled: t.stCancelled,
    rejected: t.stRejected,
  };
  return (status: BookingStatus) => map[status] ?? status;
}

/** The single next status a driver may set, following the trip order. */
export function nextStatus(status: BookingStatus): { status: BookingStatus; key: keyof DashboardText } | null {
  if (status === "driver_accepted") return { status: "driver_arriving", key: "markArriving" };
  if (status === "driver_arriving") return { status: "driver_arrived", key: "markArrived" };
  if (status === "driver_arrived") return { status: "trip_started", key: "markStarted" };
  if (status === "trip_started") return { status: "completed", key: "markCompleted" };
  return null;
}

const TONE: Partial<Record<BookingStatus, string>> = {
  pending: "bg-secondary text-foreground",
  completed: "bg-primary-soft text-primary",
  cancelled: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
};

type Props = {
  booking: DriverBooking;
  busy?: boolean;
  canAct?: boolean;
  onAccept?: (() => void) | undefined;
  onReject?: (() => void) | undefined;
  onAdvance?: ((status: BookingStatus) => void) | undefined;
  onCancel?: (() => void) | undefined;
};

export function BookingCard({ booking, busy, canAct = true, onAccept, onReject, onAdvance, onCancel }: Props) {
  const t = useDashboardText();
  const labels = useBookingLabels();
  const statusLabel = useStatusLabel();
  const [open, setOpen] = useState(false);
  const step = nextStatus(booking.status);
  const cancellable = ["driver_accepted", "driver_arriving", "driver_arrived"].includes(booking.status);

  const rows: [string, string][] = [
    [t.bookingId, booking.id],
    [t.passengerInfo, booking.contact_name ?? t.guestBooking],
    [t.passengerPhone, booking.contact_phone ?? t.notProvided],
    [t.pickupCity, labels.city(booking.pickup_city)],
    [t.pickupLocation, booking.pickup_location],
    [t.destination, labels.airport(booking.destination_airport)],
    [t.dateLbl, booking.date],
    [t.timeLbl, booking.time.slice(0, 5)],
    [t.adults, String(booking.adults)],
    [t.children, String(booking.children)],
    [t.largeLuggage, String(booking.large_luggage)],
    [t.handLuggage, String(booking.hand_luggage)],
    [t.rideLbl, labels.ride(booking.ride_type)],
    [t.priceLbl, labels.price(booking.price)],
    [t.statusLbl, statusLabel(booking.status)],
  ];

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-card-foreground">
            {labels.city(booking.pickup_city)} → {labels.airport(booking.destination_airport)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {booking.date} · {booking.time.slice(0, 5)} · {labels.ride(booking.ride_type)} · {booking.passengers} · {booking.luggage}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${TONE[booking.status] ?? "bg-primary-soft text-primary"}`}>
            {statusLabel(booking.status)}
          </span>
          <span className="text-base font-bold text-primary">{labels.price(booking.price)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary"
      >
        {open ? t.hideDetails : t.details}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border bg-secondary/50 px-3 py-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 break-words text-sm font-semibold text-card-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {booking.status === "pending" && (onAccept || onReject) ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {onAccept ? (
            <button
              type="button"
              onClick={onAccept}
              disabled={busy || !canAct}
              className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-bold text-primary-foreground disabled:opacity-60"
            >
              <Check className="size-4" aria-hidden="true" />{busy ? t.working : t.accept}
            </button>
          ) : null}
          {onReject ? (
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-md border border-input px-6 text-base font-bold text-destructive disabled:opacity-60"
            >
              <X className="size-4" aria-hidden="true" />{t.reject}
            </button>
          ) : null}
        </div>
      ) : null}

      {step && onAdvance ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onAdvance(step.status)}
            disabled={busy}
            className="inline-flex min-h-13 flex-1 items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? t.working : t[step.key]}
          </button>
          {cancellable && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex min-h-13 items-center justify-center rounded-md border border-input px-5 text-sm font-bold text-destructive disabled:opacity-60"
            >
              {t.cancelBooking}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
