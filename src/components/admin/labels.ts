import { useAdminText } from "@/lib/i18n-admin";

type Tone = "neutral" | "good" | "warn" | "bad";

/** Translated labels + colour tones for every status value the admin panel shows. */
export function useAdminLabels() {
  const a = useAdminText();

  const driverStatus = (status: string): { label: string; tone: Tone } => {
    switch (status) {
      case "pending":
        return { label: a.stPending, tone: "warn" };
      case "approved":
        return { label: a.stApproved, tone: "good" };
      case "active":
        return { label: a.stActive, tone: "good" };
      case "blocked":
        return { label: a.stBlocked, tone: "bad" };
      case "suspended":
        return { label: a.stSuspended, tone: "bad" };
      default:
        return { label: status, tone: "neutral" };
    }
  };

  const bookingStatus = (status: string): { label: string; tone: Tone } => {
    switch (status) {
      case "pending":
        return { label: a.bkPending, tone: "warn" };
      case "driver_accepted":
        return { label: a.bkAccepted, tone: "good" };
      case "driver_arriving":
        return { label: a.bkArriving, tone: "good" };
      case "driver_arrived":
        return { label: a.bkArrived, tone: "good" };
      case "trip_started":
        return { label: a.bkStarted, tone: "good" };
      case "completed":
        return { label: a.bkCompleted, tone: "neutral" };
      case "cancelled":
        return { label: a.bkCancelled, tone: "bad" };
      case "rejected":
        return { label: a.bkRejected, tone: "bad" };
      default:
        return { label: status, tone: "neutral" };
    }
  };

  const offerStatus = (status: string): { label: string; tone: Tone } => {
    switch (status) {
      case "active":
        return { label: a.ofActive, tone: "good" };
      case "paused":
        return { label: a.ofPaused, tone: "warn" };
      default:
        return { label: a.ofExpired, tone: "neutral" };
    }
  };

  const paymentStatus = (status: string): { label: string; tone: Tone } => {
    switch (status) {
      case "pending":
        return { label: a.payPending, tone: "warn" };
      case "processing":
        return { label: a.payProcessing, tone: "warn" };
      case "completed":
        return { label: a.payCompleted, tone: "good" };
      case "failed":
        return { label: a.payFailed, tone: "bad" };
      default:
        return { label: a.payCancelled, tone: "bad" };
    }
  };

  const commissionStatus = (type: string, status: string): { label: string; tone: Tone } => {
    if (status === "failed") return { label: a.cmFailed, tone: "bad" };
    if (status === "pending") return { label: a.cmPaymentPending, tone: "warn" };
    return type === "payment" ? { label: a.cmPaid, tone: "good" } : { label: a.cmOutstanding, tone: "neutral" };
  };

  const city = (value: string) => (value === "makkah" ? a.makkah : a.madinah);
  const airport = (value: string) => (value === "jeddah" ? a.jeddah : value === "taif" ? a.taif : a.madinahAirport);
  const rideType = (value: string) => (value === "shared" ? a.shared : a.private);
  const txnType = (value: string) => (value === "payment" ? a.typePayment : a.typeCharge);

  return { driverStatus, bookingStatus, offerStatus, paymentStatus, commissionStatus, city, airport, rideType, txnType };
}
