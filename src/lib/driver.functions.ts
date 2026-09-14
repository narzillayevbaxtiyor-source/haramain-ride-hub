import { createServerFn } from "@tanstack/react-start";
import { createHash, randomInt } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Airport, PickupCity, RideType } from "@/lib/booking";

/** Outstanding commission (SAR) at which a driver account is blocked automatically. */
export const COMMISSION_BLOCK_THRESHOLD = 400;
/** Platform commission taken from completed bookings. */
export const COMMISSION_RATE = 0.1;

export type DriverStatus = "pending" | "approved" | "active" | "blocked" | "suspended";

export type DriverAccount = {
  profile: { name: string | null; phone: string | null; phone_verified: boolean; email: string | null };
  driver: {
    id: string;
    status: DriverStatus;
    vehicle_type: string;
    vehicle_model: string | null;
    plate_number: string | null;
    seats: number;
    luggage_capacity: number;
    exterior_photo: string | null;
    interior_photo: string | null;
    commission_rate: number;
    commission_balance_sar: number;
  } | null;
};

const normalizePhone = (raw: string) => {
  const digits = (raw ?? "").replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
};

const validPhone = (phone: string) => /^\+\d{8,15}$/.test(phone);

const hashCode = (code: string, phone: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

/** Sends (architecture-ready) an OTP for the phone number that will become the driver's unique identity. */
export const requestPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => input)
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!validPhone(phone)) return { ok: false as const, reason: "invalid_phone" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The verified phone number is the primary unique driver identity.
    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("id, phone_verified")
      .eq("phone", phone)
      .maybeSingle();

    if (owner && owner.id !== context.userId) {
      return { ok: false as const, reason: "phone_taken" as const };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { error } = await supabaseAdmin.from("phone_verifications").insert({
      user_id: context.userId,
      phone,
      code_hash: hashCode(code, phone),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw error;

    // No SMS provider is connected yet; the code is returned so the flow is usable
    // during setup. Once a provider is added, deliver it by SMS and stop returning it.
    return { ok: true as const, phone, smsConfigured: false as const, code };
  });

/** Verifies the OTP and records the phone number as the account's verified identity. */
export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; code: string }) => input)
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    const code = (data.code ?? "").trim();
    if (!validPhone(phone) || !/^\d{6}$/.test(code)) return { ok: false as const, reason: "invalid_code" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (owner && owner.id !== context.userId) return { ok: false as const, reason: "phone_taken" as const };

    const { data: record } = await supabaseAdmin
      .from("phone_verifications")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("user_id", context.userId)
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record || new Date(record.expires_at) < new Date() || record.attempts >= 5) {
      return { ok: false as const, reason: "invalid_code" as const };
    }

    if (record.code_hash !== hashCode(code, phone)) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);
      return { ok: false as const, reason: "invalid_code" as const };
    }

    await supabaseAdmin.from("phone_verifications").update({ consumed_at: new Date().toISOString() }).eq("id", record.id);

    const email = (context.claims["email"] as string | undefined) ?? null;
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: context.userId, phone, phone_verified: true, email, role: "driver" }, { onConflict: "id" });
    if (error) throw error;

    return { ok: true as const, phone };
  });

/** Current driver account for the signed-in user (no private data of other drivers). */
export const getDriverAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriverAccount> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("name, phone, phone_verified, email")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: driver } = await context.supabase
      .from("drivers")
      .select(
        "id, status, vehicle_type, vehicle_model, plate_number, seats, luggage_capacity, exterior_photo, interior_photo, commission_rate, commission_balance_sar",
      )
      .eq("user_id", context.userId)
      .maybeSingle();

    return {
      profile: profile ?? { name: null, phone: null, phone_verified: false, email: null },
      driver: (driver as DriverAccount["driver"]) ?? null,
    };
  });

type RegistrationInput = {
  fullName: string;
  vehicleType: string;
  vehicleModel: string;
  plateNumber: string;
  seats: number;
  luggageCapacity: number;
  exteriorPhoto: string;
  interiorPhoto: string;
  commissionAgreed: boolean;
};

async function plateOwnedByOther(plate: string, exceptDriverId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("drivers")
    .select("id, plate_number, status")
    .neq("status", "suspended");
  return (data ?? []).some(
    (row) =>
      (row.plate_number ?? "").trim().toLowerCase() === plate.toLowerCase() && row.id !== exceptDriverId,
  );
}

/** Completes driver registration. All uniqueness and agreement rules are enforced here. */
export const completeDriverRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RegistrationInput) => input)
  .handler(async ({ data, context }) => {
    const plate = (data.plateNumber ?? "").trim();
    const name = (data.fullName ?? "").trim();

    if (!data.commissionAgreed) return { ok: false as const, reason: "need_agreement" as const };
    if (!name) return { ok: false as const, reason: "need_name" as const };
    if (!data.vehicleType || !(data.vehicleModel ?? "").trim() || !plate) {
      return { ok: false as const, reason: "need_vehicle" as const };
    }
    if (!data.exteriorPhoto || !data.interiorPhoto) return { ok: false as const, reason: "need_photos" as const };
    if (!(data.seats >= 1) || !(data.luggageCapacity >= 0)) return { ok: false as const, reason: "need_vehicle" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, phone, phone_verified")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.phone || !profile.phone_verified) return { ok: false as const, reason: "need_phone" as const };

    // The verified phone may belong to only one driver account, blocked accounts included.
    const { data: phoneOwners } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", profile.phone);
    const otherOwner = (phoneOwners ?? []).find((row) => row.id !== context.userId);
    if (otherOwner) return { ok: false as const, reason: "phone_taken" as const };

    const { data: existing } = await supabaseAdmin
      .from("drivers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: false as const, reason: "already_registered" as const };

    if (await plateOwnedByOther(plate)) return { ok: false as const, reason: "plate_taken" as const };

    await supabaseAdmin.from("profiles").update({ name, role: "driver" }).eq("id", context.userId);

    const { data: created, error } = await supabaseAdmin
      .from("drivers")
      .insert({
        user_id: context.userId,
        status: "active",
        vehicle_type: data.vehicleType,
        vehicle_model: data.vehicleModel.trim(),
        plate_number: plate,
        seats: data.seats,
        luggage_capacity: data.luggageCapacity,
        exterior_photo: data.exteriorPhoto,
        interior_photo: data.interiorPhoto,
        commission_rate: COMMISSION_RATE,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505" || error.code === "23p01" || error.message.toLowerCase().includes("plate")) {
        return { ok: false as const, reason: "plate_taken" as const };
      }
      throw error;
    }

    return { ok: true as const, driverId: created.id };
  });

/** Profile editing. The verified phone number can never be changed here. */
export const updateDriverProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    fullName: string;
    vehicleType: string;
    vehicleModel: string;
    plateNumber: string;
    seats: number;
    luggageCapacity: number;
    exteriorPhoto?: string | null;
    interiorPhoto?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const plate = (data.plateNumber ?? "").trim();
    const name = (data.fullName ?? "").trim();
    if (!name) return { ok: false as const, reason: "need_name" as const };
    if (!data.vehicleType || !(data.vehicleModel ?? "").trim() || !plate) {
      return { ok: false as const, reason: "need_vehicle" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: driver } = await supabaseAdmin
      .from("drivers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return { ok: false as const, reason: "not_driver" as const };

    if (await plateOwnedByOther(plate, driver.id)) return { ok: false as const, reason: "plate_taken" as const };

    await supabaseAdmin.from("profiles").update({ name }).eq("id", context.userId);

    const { error } = await supabaseAdmin
      .from("drivers")
      .update({
        vehicle_type: data.vehicleType,
        vehicle_model: data.vehicleModel.trim(),
        plate_number: plate,
        seats: data.seats,
        luggage_capacity: data.luggageCapacity,
        ...(data.exteriorPhoto ? { exterior_photo: data.exteriorPhoto } : {}),
        ...(data.interiorPhoto ? { interior_photo: data.interiorPhoto } : {}),
      })
      .eq("id", driver.id);
    if (error) throw error;

    return { ok: true as const };
  });

export type DriverOfferRow = {
  id: string;
  pickup_city: PickupCity;
  pickup_location: string | null;
  destination_airport: Airport;
  date: string;
  time: string;
  ride_type: RideType;
  price: number;
  status: string;
};

export const listDriverOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriverOfferRow[]> => {
    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return [];

    const { data } = await context.supabase
      .from("driver_offers")
      .select("id, pickup_city, pickup_location, destination_airport, date, time, ride_type, price, status")
      .eq("driver_id", driver.id)
      .order("date", { ascending: true });
    return (data ?? []) as DriverOfferRow[];
  });

/** Drivers set their own price. Blocked or suspended accounts cannot create offers. */
export const createDriverOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    pickupCity: PickupCity;
    pickupLocation?: string;
    destinationAirport: Airport;
    date: string;
    time: string;
    rideType: RideType;
    price: number;
  }) => input)
  .handler(async ({ data, context }) => {
    if (!data.pickupCity || !data.destinationAirport || !data.date || !data.time || !data.rideType) {
      return { ok: false as const, reason: "invalid" as const };
    }
    if (!(Number(data.price) > 0)) return { ok: false as const, reason: "invalid_price" as const };
    if (new Date(`${data.date}T${data.time}`).getTime() < Date.now()) {
      return { ok: false as const, reason: "past_date" as const };
    }

    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return { ok: false as const, reason: "not_driver" as const };
    if (!["active", "approved"].includes(driver.status)) return { ok: false as const, reason: "blocked" as const };

    const { error } = await context.supabase.from("driver_offers").insert({
      driver_id: driver.id,
      pickup_city: data.pickupCity,
      pickup_location: data.pickupLocation ?? null,
      destination_airport: data.destinationAirport,
      date: data.date,
      time: data.time,
      ride_type: data.rideType,
      price: Number(data.price),
      status: "active",
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteDriverOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("driver_offers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export type CommissionRow = {
  id: string;
  amount_sar: number;
  type: string;
  status: string;
  created_at: string;
};

export const listCommissionTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommissionRow[]> => {
    const { data } = await context.supabase
      .from("commission_transactions")
      .select("id, amount_sar, type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []) as CommissionRow[];
  });

/* ---------------------------------------------------------------------------
 * Booking management (driver side)
 * ------------------------------------------------------------------------- */

export type BookingStatus =
  | "pending"
  | "driver_accepted"
  | "driver_arriving"
  | "driver_arrived"
  | "trip_started"
  | "completed"
  | "cancelled"
  | "rejected";

export type DriverBooking = {
  id: string;
  status: BookingStatus;
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
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
};

const BOOKING_COLUMNS =
  "id, status, pickup_city, pickup_location, destination_airport, date, time, adults, children, passengers, large_luggage, hand_luggage, luggage, ride_type, price, contact_name, contact_phone, created_at";

/** Every booking assigned to the signed-in driver. RLS keeps other drivers' bookings out. */
export const listDriverBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriverBooking[]> => {
    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return [];

    const { data } = await context.supabase
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false });
    return (data ?? []) as unknown as DriverBooking[];
  });

/** Only an active driver may accept. Rejection frees the passenger to pick another offer. */
export const respondToBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; accept: boolean; reason?: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return { ok: false as const, reason: "not_driver" as const };
    if (data.accept && !["active", "approved"].includes(driver.status)) {
      return { ok: false as const, reason: "blocked" as const };
    }

    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, status")
      .eq("id", data.id)
      .eq("driver_id", driver.id)
      .maybeSingle();
    if (!booking) return { ok: false as const, reason: "not_found" as const };
    if (booking.status !== "pending") return { ok: false as const, reason: "invalid_transition" as const };

    const { error } = await context.supabase
      .from("bookings")
      .update({
        status: data.accept ? "driver_accepted" : "rejected",
        ...(data.accept ? {} : { cancellation_reason: (data.reason ?? "").trim() || null, cancelled_by: context.userId }),
      })
      .eq("id", data.id);

    if (error) {
      // The database refuses a second accepted trip that overlaps an existing one.
      if (error.message.includes("booking_conflict")) return { ok: false as const, reason: "conflict" as const };
      return { ok: false as const, reason: "invalid_transition" as const };
    }
    return { ok: true as const };
  });

const DRIVER_STATUS_STEPS: BookingStatus[] = [
  "driver_arriving",
  "driver_arrived",
  "trip_started",
  "completed",
  "cancelled",
];

/** Sequential status updates. The database also rejects invalid jumps. */
export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: BookingStatus; reason?: string }) => input)
  .handler(async ({ data, context }) => {
    if (!DRIVER_STATUS_STEPS.includes(data.status)) return { ok: false as const, reason: "invalid_transition" as const };

    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return { ok: false as const, reason: "not_driver" as const };
    if (["blocked", "suspended"].includes(driver.status) && data.status !== "cancelled") {
      return { ok: false as const, reason: "blocked" as const };
    }

    const { error } = await context.supabase
      .from("bookings")
      .update({
        status: data.status,
        ...(data.status === "cancelled"
          ? { cancellation_reason: (data.reason ?? "").trim() || null, cancelled_by: context.userId }
          : {}),
      })
      .eq("id", data.id)
      .eq("driver_id", driver.id);
    if (error) return { ok: false as const, reason: "invalid_transition" as const };
    return { ok: true as const };
  });

/* ---------------------------------------------------------------------------
 * Offer editing and availability
 * ------------------------------------------------------------------------- */

export const updateDriverOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    pickupCity: PickupCity;
    destinationAirport: Airport;
    date: string;
    time: string;
    rideType: RideType;
    price: number;
  }) => input)
  .handler(async ({ data, context }) => {
    if (!(Number(data.price) > 0)) return { ok: false as const, reason: "invalid_price" as const };
    if (new Date(`${data.date}T${data.time}`).getTime() < Date.now()) {
      return { ok: false as const, reason: "past_date" as const };
    }

    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return { ok: false as const, reason: "not_driver" as const };
    if (!["active", "approved"].includes(driver.status)) return { ok: false as const, reason: "blocked" as const };

    const { error } = await context.supabase
      .from("driver_offers")
      .update({
        pickup_city: data.pickupCity,
        destination_airport: data.destinationAirport,
        date: data.date,
        time: data.time,
        ride_type: data.rideType,
        price: Number(data.price),
      })
      .eq("id", data.id)
      .eq("driver_id", driver.id);
    if (error) return { ok: false as const, reason: "duplicate" as const };
    return { ok: true as const };
  });

export const setDriverOfferStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "active" | "paused" }) => input)
  .handler(async ({ data, context }) => {
    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id, status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return { ok: false as const, reason: "not_driver" as const };
    if (data.status === "active" && !["active", "approved"].includes(driver.status)) {
      return { ok: false as const, reason: "blocked" as const };
    }

    const { error } = await context.supabase
      .from("driver_offers")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("driver_id", driver.id);
    if (error) throw error;
    return { ok: true as const };
  });

/* ---------------------------------------------------------------------------
 * Commission and payment foundation
 * ------------------------------------------------------------------------- */

export type PaymentRow = {
  id: string;
  amount_sar: number;
  amount_usd: number | null;
  provider: string;
  status: string;
  created_at: string;
};

export type CommissionSummary = {
  charged: number;
  paid: number;
  outstanding: number;
  transactions: CommissionRow[];
  payments: PaymentRow[];
};

export const getCommissionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommissionSummary> => {
    const { data: driver } = await context.supabase
      .from("drivers")
      .select("id, commission_balance_sar")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!driver) return { charged: 0, paid: 0, outstanding: 0, transactions: [], payments: [] };

    const { data: rows } = await context.supabase
      .from("commission_transactions")
      .select("id, amount_sar, type, status, created_at")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false });

    const transactions = (rows ?? []) as CommissionRow[];
    const sum = (type: string) =>
      transactions
        .filter((row) => row.type === type && row.status === "confirmed")
        .reduce((total, row) => total + Number(row.amount_sar), 0);

    const { data: payments } = await context.supabase
      .from("payment_transactions")
      .select("id, amount_sar, amount_usd, provider, status, created_at")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      charged: sum("commission_charge"),
      paid: sum("payment"),
      outstanding: Number(driver.commission_balance_sar),
      transactions,
      payments: (payments ?? []) as PaymentRow[],
    };
  });
