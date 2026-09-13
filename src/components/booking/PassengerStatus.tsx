import { useMyBookingText } from "@/lib/i18n-mybookings";
import type { BookingStatus } from "@/lib/driver.functions";

export function usePassengerStatusLabel() {
  const m = useMyBookingText();
  const map: Record<BookingStatus, string> = {
    pending: m.sPending,
    driver_accepted: m.sAccepted,
    driver_arriving: m.sArriving,
    driver_arrived: m.sArrived,
    trip_started: m.sStarted,
    completed: m.sCompleted,
    cancelled: m.sCancelled,
    rejected: m.sRejected,
  };
  return (status: BookingStatus) => map[status] ?? status;
}

const TONE: Partial<Record<BookingStatus, string>> = {
  pending: "bg-secondary text-foreground",
  completed: "bg-primary-soft text-primary",
  cancelled: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const label = usePassengerStatusLabel();
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${TONE[status] ?? "bg-primary-soft text-primary"}`}>
      {label(status)}
    </span>
  );
}
