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
