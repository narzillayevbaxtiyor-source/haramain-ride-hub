import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Airport, PickupCity, RideType } from "@/lib/booking";
import type { BookingStatus } from "@/lib/driver.functions";

export type PassengerBooking = {
  id: string;
  status: BookingStatus;
  previous_status: BookingStatus | null;
  pickup_city: PickupCity;
  pickup_location: string;
  destination_airport: Airport;
  date: string;
  time: string;
  adults: number;
  children: number;
  passengers: number;
  large_luggage: number;
  hand_luggage: number;
  luggage: number;
  ride_type: RideType;
  price: number;
  currency: string;
  created_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  /** Only the driver details a passenger needs for the trip. */
  driver_name: string | null;
  vehicle_type: string | null;
  vehicle_model: string | null;
  plate_number: string | null;
};

export type BookingHistoryEntry = {
  id: string;
  status: BookingStatus;
  note: string | null;
  created_at: string;
};

const BOOKING_COLUMNS =
  "id, driver_id, status, previous_status, pickup_city, pickup_location, destination_airport, date, time, adults, children, passengers, large_luggage, hand_luggage, luggage, ride_type, price, currency, created_at, cancelled_at, cancellation_reason";

/** Adds the small, non-sensitive slice of driver data a passenger is allowed to see. */
async function withDriverDetails(rows: Record<string, unknown>[]): Promise<PassengerBooking[]> {
  const driverIds = Array.from(new Set(rows.map((row) => row["driver_id"]).filter(Boolean))) as string[];
  if (driverIds.length === 0) {
    return rows.map((row) => ({
      ...(row as unknown as PassengerBooking),
      driver_name: null,
      vehicle_type: null,
      vehicle_model: null,
      plate_number: null,
    }));
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: drivers } = await supabaseAdmin
    .from("drivers")
    .select("id, user_id, vehicle_type, vehicle_model, plate_number")
    .in("id", driverIds);

  const userIds = (drivers ?? []).map((driver) => driver.user_id);
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, name").in("id", userIds);
  const nameOf = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));

  const byId = new Map(
    (drivers ?? []).map((driver) => [
      driver.id,
      {
        driver_name: nameOf.get(driver.user_id) ?? null,
        vehicle_type: driver.vehicle_type,
        vehicle_model: driver.vehicle_model,
        plate_number: driver.plate_number,
      },
    ]),
  );

  return rows.map((row) => {
    const details = byId.get(row["driver_id"] as string);
    return {
      ...(row as unknown as PassengerBooking),
      driver_name: details?.driver_name ?? null,
      vehicle_type: details?.vehicle_type ?? null,
      vehicle_model: details?.vehicle_model ?? null,
      plate_number: details?.plate_number ?? null,
    };
  });
}

type CreateInput = {
  offerId: string;
  pickupLocation: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  largeLuggage: number;
  handLuggage: number;
};

type CreateReason =
  | "offer_unavailable"
  | "driver_unavailable"
  | "duplicate_booking"
  | "booking_conflict"
  | "capacity"
  | "invalid"
  | "failed";

const reasonFromDatabase = (message: string): CreateReason => {
  if (message.includes("offer_unavailable")) return "offer_unavailable";
  if (message.includes("driver_unavailable") || message.includes("driver_required")) return "driver_unavailable";
  if (message.includes("duplicate_booking")) return "duplicate_booking";
  if (message.includes("booking_conflict")) return "booking_conflict";
  return "failed";
};

/**
 * Creates the real booking after the passenger confirmed the offer.
 * The price is taken from the offer at this moment and locked to the booking:
 * later offer price changes never affect an existing booking.
 */
export const createPassengerBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateInput) => input)
  .handler(async ({ data, context }) => {
    const passengers = Number(data.adults) + Number(data.children);
    const luggage = Number(data.largeLuggage) + Number(data.handLuggage);
    if (!data.offerId || !data.date || !data.time || passengers < 1 || !data.pickupLocation.trim()) {
      return { ok: false as const, reason: "invalid" as CreateReason };
    }

    // public_driver_offers only exposes offers that are active and belong to a driver
    // whose account can take bookings, so an inactive offer or blocked driver never matches.
    const { data: offer } = await context.supabase
      .from("public_driver_offers")
      .select("id, driver_id, pickup_city, destination_airport, date, ride_type, price, seats, luggage_capacity")
      .eq("id", data.offerId)
      .maybeSingle();

    if (!offer || !offer.driver_id || !offer.pickup_city || !offer.destination_airport || !offer.ride_type || offer.price === null) {
      return { ok: false as const, reason: "offer_unavailable" as CreateReason };
    }
    if (offer.date !== data.date) return { ok: false as const, reason: "offer_unavailable" as CreateReason };
    if (Number(offer.seats) < passengers || Number(offer.luggage_capacity) < luggage) {
      return { ok: false as const, reason: "capacity" as CreateReason };
    }

    // A booking is linked to the passenger's profile row, which does not exist yet the
    // first time somebody signs in through Google. Create it before booking.
    let { data: profile } = await context.supabase
      .from("profiles")
      .select("name, phone")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile) {
      const claims = context.claims as { email?: string; user_metadata?: { full_name?: string; name?: string; avatar_url?: string } };
      await context.supabase.from("profiles").insert({
        id: context.userId,
        role: "passenger",
        email: claims?.email ?? null,
        name: claims?.user_metadata?.full_name ?? claims?.user_metadata?.name ?? null,
        avatar_url: claims?.user_metadata?.avatar_url ?? null,
      });
      const { data: created } = await context.supabase
        .from("profiles")
        .select("name, phone")
        .eq("id", context.userId)
        .maybeSingle();
      profile = created;
    }


    const { data: created, error } = await context.supabase
      .from("bookings")
      .insert({
        passenger_id: context.userId,
        driver_id: offer.driver_id,
        offer_id: offer.id,
        pickup_city: offer.pickup_city,
        pickup_location: data.pickupLocation.trim(),
        destination_airport: offer.destination_airport,
        date: data.date,
        time: data.time,
        adults: Number(data.adults),
        children: Number(data.children),
        passengers,
        large_luggage: Number(data.largeLuggage),
        hand_luggage: Number(data.handLuggage),
        luggage,
        ride_type: offer.ride_type,
        price: Number(offer.price),
        currency: "SAR",
        status: "pending",
        contact_name: profile?.name ?? null,
        contact_phone: profile?.phone ?? null,
      })
      .select("id")
      .single();

    if (error || !created) {
      return { ok: false as const, reason: reasonFromDatabase(error?.message ?? "") };
    }
    return { ok: true as const, bookingId: created.id };
  });

/** All bookings belonging to the signed-in passenger. RLS keeps other people's trips out. */
export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PassengerBooking[]> => {
    const { data } = await context.supabase
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .eq("passenger_id", context.userId)
      .order("created_at", { ascending: false });
    return withDriverDetails((data ?? []) as unknown as Record<string, unknown>[]);
  });

export const getMyBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ booking: PassengerBooking; history: BookingHistoryEntry[] } | null> => {
    const { data: row } = await context.supabase
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .eq("id", data.id)
      .eq("passenger_id", context.userId)
      .maybeSingle();
    if (!row) return null;

    const [booking] = await withDriverDetails([row as unknown as Record<string, unknown>]);
    if (!booking) return null;

    const { data: history } = await context.supabase
      .from("booking_status_history")
      .select("id, status, note, created_at")
      .eq("booking_id", data.id)
      .order("created_at", { ascending: true });

    return { booking, history: (history ?? []) as BookingHistoryEntry[] };
  });

const PASSENGER_CANCELLABLE: BookingStatus[] = ["pending", "driver_accepted", "driver_arriving", "driver_arrived"];

/** Real cancellation: the booking stays in history with who cancelled it, when and why. */
export const cancelMyBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; reason: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, status")
      .eq("id", data.id)
      .eq("passenger_id", context.userId)
      .maybeSingle();

    if (!booking) return { ok: false as const, reason: "not_found" as const };
    if (!PASSENGER_CANCELLABLE.includes(booking.status as BookingStatus)) {
      return { ok: false as const, reason: "cannot_cancel" as const };
    }

    const { error } = await context.supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: (data.reason ?? "").trim() || null,
        cancelled_by: context.userId,
      })
      .eq("id", data.id)
      .eq("passenger_id", context.userId);

    if (error) return { ok: false as const, reason: "cannot_cancel" as const };
    return { ok: true as const };
  });
