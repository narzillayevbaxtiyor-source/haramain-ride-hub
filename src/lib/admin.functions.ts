import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Airport, PickupCity, RideType } from "@/lib/booking";
import type { BookingStatus, DriverStatus } from "@/lib/driver.functions";

export const COMMISSION_BLOCK_THRESHOLD = 400;

export type BlockReason = "outstanding_commission" | "admin_suspension" | "other";

/**
 * Verifies the caller holds the admin role. The check runs through the caller's
 * own authenticated client so RLS + has_role() decide, never the frontend.
 */
async function assertAdmin(context: { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type AdminDb = Awaited<ReturnType<typeof assertAdmin>>;

async function logAction(
  db: AdminDb,
  adminId: string,
  action: string,
  target_table: string,
  target_id: string | null,
  details?: Record<string, unknown>,
) {
  await db.from("admin_activity_log").insert({
    admin_id: adminId,
    action,
    target_table,
    target_id,
    details: details ?? null,
  });
}

/** Tells the frontend whether the signed-in user may see the admin panel. */
export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: data === true };
  });

export type AdminStats = {
  passengers: number;
  drivers: number;
  driversActive: number;
  driversPending: number;
  driversBlocked: number;
  driversSuspended: number;
  bookings: number;
  bookingsPending: number;
  tripsActive: number;
  tripsCompleted: number;
  tripsCancelled: number;
  revenue: number;
  commissionOutstanding: number;
  commissionPaid: number;
  paymentsPending: number;
};

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const db = await assertAdmin(context);

    const [profiles, drivers, bookings, commissions, payments] = await Promise.all([
      db.from("profiles").select("id, role"),
      db.from("drivers").select("status"),
      db.from("bookings").select("status, price"),
      db.from("commission_transactions").select("type, amount_sar, status"),
      db.from("payment_transactions").select("status"),
    ]);

    const driverRows = drivers.data ?? [];
    const bookingRows = bookings.data ?? [];
    const commissionRows = commissions.data ?? [];
    const countStatus = (list: { status: string }[], ...statuses: string[]) =>
      list.filter((row) => statuses.includes(row.status)).length;

    const charged = commissionRows
      .filter((row) => row.type === "commission_charge" && row.status === "confirmed")
      .reduce((sum, row) => sum + Number(row.amount_sar), 0);
    const paid = commissionRows
      .filter((row) => row.type === "payment" && row.status === "confirmed")
      .reduce((sum, row) => sum + Number(row.amount_sar), 0);

    return {
      passengers: (profiles.data ?? []).filter((row) => row.role === "passenger").length,
      drivers: driverRows.length,
      driversActive: countStatus(driverRows, "active", "approved"),
      driversPending: countStatus(driverRows, "pending"),
      driversBlocked: countStatus(driverRows, "blocked"),
      driversSuspended: countStatus(driverRows, "suspended"),
      bookings: bookingRows.length,
      bookingsPending: countStatus(bookingRows, "pending"),
      tripsActive: countStatus(bookingRows, "driver_accepted", "driver_arriving", "driver_arrived", "trip_started"),
      tripsCompleted: countStatus(bookingRows, "completed"),
      tripsCancelled: countStatus(bookingRows, "cancelled", "rejected"),
      revenue: bookingRows
        .filter((row) => row.status === "completed")
        .reduce((sum, row) => sum + Number(row.price), 0),
      commissionOutstanding: Math.max(charged - paid, 0),
      commissionPaid: paid,
      paymentsPending: countStatus(payments.data ?? [], "pending", "processing"),
    };
  });

export type AdminDriverRow = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  vehicle_type: string;
  vehicle_model: string | null;
  plate_number: string | null;
  seats: number;
  luggage_capacity: number;
  status: DriverStatus;
  created_at: string;
  commission_balance_sar: number;
  block_reason: string | null;
  blocked_by_commission: boolean;
};

export const listDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDriverRow[]> => {
    const db = await assertAdmin(context);
    const { data: drivers } = await db
      .from("drivers")
      .select(
        "id, user_id, vehicle_type, vehicle_model, plate_number, seats, luggage_capacity, status, created_at, commission_balance_sar, block_reason, blocked_by_commission",
      )
      .order("created_at", { ascending: false });

    const rows = drivers ?? [];
    const { data: profiles } = await db
      .from("profiles")
      .select("id, name, phone, email")
      .in("id", rows.map((row) => row.user_id));
    const byUser = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    return rows.map((row) => {
      const profile = byUser.get(row.user_id);
      return {
        ...row,
        status: row.status as DriverStatus,
        name: profile?.name ?? null,
        phone: profile?.phone ?? null,
        email: profile?.email ?? null,
      };
    });
  });

export type AdminDriverDetail = {
  driver: AdminDriverRow & {
    exterior_photo: string | null;
    interior_photo: string | null;
    phone_verified: boolean;
    commission_rate: number;
    exterior_url: string | null;
    interior_url: string | null;
  };
  stats: { activeOffers: number; bookings: number; completed: number; cancelled: number };
  commissions: {
    id: string;
    amount_sar: number;
    type: string;
    status: string;
    booking_id: string | null;
    created_at: string;
  }[];
  payments: {
    id: string;
    amount_sar: number;
    amount_usd: number | null;
    status: string;
    provider_reference: string | null;
    created_at: string;
    updated_at: string;
  }[];
};

export const getDriverDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { driverId: string }) => input)
  .handler(async ({ data, context }): Promise<AdminDriverDetail | null> => {
    const db = await assertAdmin(context);
    const { data: driver } = await db.from("drivers").select("*").eq("id", data.driverId).maybeSingle();
    if (!driver) return null;

    const [profile, offers, bookings, commissions, payments] = await Promise.all([
      db.from("profiles").select("name, phone, email, phone_verified").eq("id", driver.user_id).maybeSingle(),
      db.from("driver_offers").select("id, status").eq("driver_id", driver.id),
      db.from("bookings").select("status").eq("driver_id", driver.id),
      db
        .from("commission_transactions")
        .select("id, amount_sar, type, status, booking_id, created_at")
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false }),
      db
        .from("payment_transactions")
        .select("id, amount_sar, amount_usd, status, provider_reference, created_at, updated_at")
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false }),
    ]);

    // Vehicle photos live in a private bucket: hand out short-lived links only.
    const sign = async (path: string | null) => {
      if (!path) return null;
      const { data: signed } = await db.storage.from("vehicle-photos").createSignedUrl(path, 600);
      return signed?.signedUrl ?? null;
    };

    const bookingRows = bookings.data ?? [];
    return {
      driver: {
        id: driver.id,
        user_id: driver.user_id,
        name: profile.data?.name ?? null,
        phone: profile.data?.phone ?? null,
        email: profile.data?.email ?? null,
        phone_verified: profile.data?.phone_verified ?? false,
        vehicle_type: driver.vehicle_type,
        vehicle_model: driver.vehicle_model,
        plate_number: driver.plate_number,
        seats: driver.seats,
        luggage_capacity: driver.luggage_capacity,
        status: driver.status as DriverStatus,
        created_at: driver.created_at,
        commission_balance_sar: Number(driver.commission_balance_sar),
        commission_rate: Number(driver.commission_rate),
        block_reason: driver.block_reason,
        blocked_by_commission: driver.blocked_by_commission,
        exterior_photo: driver.exterior_photo,
        interior_photo: driver.interior_photo,
        exterior_url: await sign(driver.exterior_photo),
        interior_url: await sign(driver.interior_photo),
      },
      stats: {
        activeOffers: (offers.data ?? []).filter((offer) => offer.status === "active").length,
        bookings: bookingRows.length,
        completed: bookingRows.filter((row) => row.status === "completed").length,
        cancelled: bookingRows.filter((row) => row.status === "cancelled" || row.status === "rejected").length,
      },
      commissions: commissions.data ?? [],
      payments: payments.data ?? [],
    };
  });

type DriverAction = "approve" | "block" | "unblock" | "suspend" | "reactivate";

/** Applies an administrative driver status change and records it in the activity log. */
export const setDriverStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { driverId: string; action: DriverAction; reason?: BlockReason | undefined }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { data: driver } = await db
      .from("drivers")
      .select("id, status, commission_balance_sar, blocked_by_commission")
      .eq("id", data.driverId)
      .maybeSingle();
    if (!driver) return { ok: false as const, reason: "not_found" as const };

    const update: Record<string, unknown> = {};
    switch (data.action) {
      case "approve":
        update["status"] = "active";
        update["block_reason"] = null;
        break;
      case "block":
        update["status"] = "blocked";
        update["block_reason"] = data.reason ?? "admin_suspension";
        break;
      case "unblock":
      case "reactivate":
        // An automatic commission block may only clear once the balance is settled.
        if (driver.blocked_by_commission && Number(driver.commission_balance_sar) >= COMMISSION_BLOCK_THRESHOLD) {
          return { ok: false as const, reason: "commission_outstanding" as const };
        }
        update["status"] = "active";
        update["block_reason"] = null;
        update["blocked_by_commission"] = false;
        break;
      case "suspend":
        update["status"] = "suspended";
        update["block_reason"] = data.reason ?? "admin_suspension";
        break;
    }

    const { error } = await db.from("drivers").update(update).eq("id", driver.id);
    if (error) return { ok: false as const, reason: "failed" as const };

    await logAction(db, context.userId, `driver_${data.action}`, "drivers", driver.id, {
      from: driver.status,
      to: update["status"],
      reason: update["block_reason"] ?? null,
    });
    return { ok: true as const, status: update["status"] as DriverStatus };
  });

export type AdminPassengerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  account_status: "active" | "suspended";
  bookings: number;
  completed: number;
  cancelled: number;
};

export const listPassengers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPassengerRow[]> => {
    const db = await assertAdmin(context);
    const { data: profiles } = await db
      .from("profiles")
      .select("id, name, email, phone, created_at, account_status, role")
      .order("created_at", { ascending: false });
    const { data: bookings } = await db.from("bookings").select("passenger_id, status");

    const tally = new Map<string, { bookings: number; completed: number; cancelled: number }>();
    for (const booking of bookings ?? []) {
      if (!booking.passenger_id) continue;
      const entry = tally.get(booking.passenger_id) ?? { bookings: 0, completed: 0, cancelled: 0 };
      entry.bookings += 1;
      if (booking.status === "completed") entry.completed += 1;
      if (booking.status === "cancelled" || booking.status === "rejected") entry.cancelled += 1;
      tally.set(booking.passenger_id, entry);
    }

    return (profiles ?? [])
      .filter((profile) => profile.role !== "driver")
      .map((profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        created_at: profile.created_at,
        account_status: profile.account_status,
        ...(tally.get(profile.id) ?? { bookings: 0, completed: 0, cancelled: 0 }),
      }));
  });

export const setPassengerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { passengerId: string; status: "active" | "suspended" }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db
      .from("profiles")
      .update({ account_status: data.status })
      .eq("id", data.passengerId);
    if (error) return { ok: false as const };
    await logAction(
      db,
      context.userId,
      data.status === "suspended" ? "passenger_suspend" : "passenger_reactivate",
      "profiles",
      data.passengerId,
    );
    return { ok: true as const };
  });

export type AdminBookingRow = {
  id: string;
  status: BookingStatus;
  passenger_name: string | null;
  driver_name: string | null;
  driver_id: string | null;
  pickup_city: PickupCity;
  pickup_location: string;
  destination_airport: Airport;
  date: string;
  time: string;
  ride_type: RideType;
  price: number;
  currency: string;
  created_at: string;
};

async function nameMaps(db: AdminDb, rows: { passenger_id: string | null; driver_id: string | null }[]) {
  const driverIds = Array.from(new Set(rows.map((row) => row.driver_id).filter(Boolean))) as string[];
  const { data: drivers } = driverIds.length
    ? await db.from("drivers").select("id, user_id").in("id", driverIds)
    : { data: [] as { id: string; user_id: string }[] };
  const userIds = Array.from(
    new Set([...(drivers ?? []).map((driver) => driver.user_id), ...rows.map((row) => row.passenger_id).filter(Boolean) as string[]]),
  );
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, name").in("id", userIds)
    : { data: [] as { id: string; name: string | null }[] };
  const nameOf = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
  const driverName = new Map((drivers ?? []).map((driver) => [driver.id, nameOf.get(driver.user_id) ?? null]));
  return { nameOf, driverName };
}

export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminBookingRow[]> => {
    const db = await assertAdmin(context);
    const { data } = await db
      .from("bookings")
      .select(
        "id, status, passenger_id, driver_id, pickup_city, pickup_location, destination_airport, date, time, ride_type, price, currency, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = data ?? [];
    const { nameOf, driverName } = await nameMaps(db, rows);
    return rows.map((row) => ({
      id: row.id,
      status: row.status as BookingStatus,
      passenger_name: row.passenger_id ? nameOf.get(row.passenger_id) ?? null : null,
      driver_name: row.driver_id ? driverName.get(row.driver_id) ?? null : null,
      driver_id: row.driver_id,
      pickup_city: row.pickup_city as PickupCity,
      pickup_location: row.pickup_location,
      destination_airport: row.destination_airport as Airport,
      date: row.date,
      time: row.time,
      ride_type: row.ride_type as RideType,
      price: Number(row.price),
      currency: row.currency,
      created_at: row.created_at,
    }));
  });

export type AdminBookingDetail = {
  booking: AdminBookingRow & {
    adults: number;
    children: number;
    large_luggage: number;
    hand_luggage: number;
    vehicle_type: string | null;
    vehicle_model: string | null;
    plate_number: string | null;
    cancellation_reason: string | null;
    cancelled_at: string | null;
  };
  commission: { amount_sar: number; status: string } | null;
  history: { id: string; status: BookingStatus; note: string | null; created_at: string }[];
};

export const getBookingDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => input)
  .handler(async ({ data, context }): Promise<AdminBookingDetail | null> => {
    const db = await assertAdmin(context);
    const { data: booking } = await db.from("bookings").select("*").eq("id", data.bookingId).maybeSingle();
    if (!booking) return null;

    const { nameOf, driverName } = await nameMaps(db, [booking]);
    const [driver, commission, history] = await Promise.all([
      booking.driver_id
        ? db.from("drivers").select("vehicle_type, vehicle_model, plate_number").eq("id", booking.driver_id).maybeSingle()
        : Promise.resolve({ data: null }),
      db
        .from("commission_transactions")
        .select("amount_sar, status")
        .eq("booking_id", booking.id)
        .eq("type", "commission_charge")
        .maybeSingle(),
      db
        .from("booking_status_history")
        .select("id, status, note, created_at")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true }),
    ]);

    return {
      booking: {
        id: booking.id,
        status: booking.status as BookingStatus,
        passenger_name: booking.passenger_id ? nameOf.get(booking.passenger_id) ?? null : null,
        driver_name: booking.driver_id ? driverName.get(booking.driver_id) ?? null : null,
        driver_id: booking.driver_id,
        pickup_city: booking.pickup_city as PickupCity,
        pickup_location: booking.pickup_location,
        destination_airport: booking.destination_airport as Airport,
        date: booking.date,
        time: booking.time,
        ride_type: booking.ride_type as RideType,
        price: Number(booking.price),
        currency: booking.currency,
        created_at: booking.created_at,
        adults: booking.adults,
        children: booking.children,
        large_luggage: booking.large_luggage,
        hand_luggage: booking.hand_luggage,
        vehicle_type: driver.data?.vehicle_type ?? null,
        vehicle_model: driver.data?.vehicle_model ?? null,
        plate_number: driver.data?.plate_number ?? null,
        cancellation_reason: booking.cancellation_reason,
        cancelled_at: booking.cancelled_at,
      },
      commission: commission.data ? { amount_sar: Number(commission.data.amount_sar), status: commission.data.status } : null,
      history: (history.data ?? []).map((entry) => ({ ...entry, status: entry.status as BookingStatus })),
    };
  });

/**
 * The only administrative booking override: a cancellation, always with a reason,
 * always written into the booking history and the activity log.
 */
export const adminCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string; reason: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const reason = data.reason.trim();
    if (reason.length < 3) return { ok: false as const, reason: "invalid" as const };

    const { data: booking } = await db.from("bookings").select("id, status").eq("id", data.bookingId).maybeSingle();
    if (!booking) return { ok: false as const, reason: "not_found" as const };
    if (["completed", "cancelled", "rejected"].includes(booking.status)) {
      return { ok: false as const, reason: "not_allowed" as const };
    }

    const { error } = await db
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: `admin: ${reason}`,
        cancelled_by: context.userId,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    if (error) return { ok: false as const, reason: "failed" as const };

    await logAction(db, context.userId, "booking_admin_cancel", "bookings", booking.id, {
      from: booking.status,
      reason,
    });
    return { ok: true as const };
  });

export type AdminOfferRow = {
  id: string;
  driver_id: string;
  driver_name: string | null;
  vehicle_type: string;
  vehicle_model: string | null;
  seats: number;
  luggage_capacity: number;
  pickup_city: PickupCity;
  destination_airport: Airport;
  ride_type: RideType;
  price: number;
  status: "active" | "paused" | "expired";
  date: string;
  time: string;
  created_at: string;
};

export const listOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOfferRow[]> => {
    const db = await assertAdmin(context);
    const { data: offers } = await db
      .from("driver_offers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = offers ?? [];
    const driverIds = Array.from(new Set(rows.map((row) => row.driver_id)));
    const { data: drivers } = driverIds.length
      ? await db
          .from("drivers")
          .select("id, user_id, vehicle_type, vehicle_model, seats, luggage_capacity")
          .in("id", driverIds)
      : { data: [] };
    const { data: profiles } = (drivers ?? []).length
      ? await db.from("profiles").select("id, name").in("id", (drivers ?? []).map((driver) => driver.user_id))
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
    const byId = new Map((drivers ?? []).map((driver) => [driver.id, driver]));

    return rows.map((row) => {
      const driver = byId.get(row.driver_id);
      return {
        id: row.id,
        driver_id: row.driver_id,
        driver_name: driver ? nameOf.get(driver.user_id) ?? null : null,
        vehicle_type: driver?.vehicle_type ?? "",
        vehicle_model: driver?.vehicle_model ?? null,
        seats: driver?.seats ?? 0,
        luggage_capacity: driver?.luggage_capacity ?? 0,
        pickup_city: row.pickup_city as PickupCity,
        destination_airport: row.destination_airport as Airport,
        ride_type: row.ride_type as RideType,
        price: Number(row.price),
        status: row.status as "active" | "paused" | "expired",
        date: row.date,
        time: row.time,
        created_at: row.created_at,
      };
    });
  });

export const setOfferStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { offerId: string; status: "active" | "paused" }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { error } = await db.from("driver_offers").update({ status: data.status }).eq("id", data.offerId);
    if (error) return { ok: false as const };
    await logAction(
      db,
      context.userId,
      data.status === "paused" ? "offer_deactivate" : "offer_activate",
      "driver_offers",
      data.offerId,
    );
    return { ok: true as const };
  });

export type AdminCommissionRow = {
  id: string;
  driver_id: string;
  driver_name: string | null;
  booking_id: string | null;
  booking_amount: number | null;
  amount_sar: number;
  type: string;
  status: string;
  created_at: string;
  payment_status: string | null;
};

export const listCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data: rows } = await db
      .from("commission_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const list = rows ?? [];

    const driverIds = Array.from(new Set(list.map((row) => row.driver_id)));
    const bookingIds = Array.from(new Set(list.map((row) => row.booking_id).filter(Boolean))) as string[];
    const [drivers, bookings, payments] = await Promise.all([
      driverIds.length ? db.from("drivers").select("id, user_id").in("id", driverIds) : Promise.resolve({ data: [] }),
      bookingIds.length ? db.from("bookings").select("id, price").in("id", bookingIds) : Promise.resolve({ data: [] }),
      db.from("payment_transactions").select("commission_transaction_id, status"),
    ]);
    const { data: profiles } = (drivers.data ?? []).length
      ? await db.from("profiles").select("id, name").in("id", (drivers.data ?? []).map((driver) => driver.user_id))
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
    const driverName = new Map((drivers.data ?? []).map((driver) => [driver.id, nameOf.get(driver.user_id) ?? null]));
    const priceOf = new Map((bookings.data ?? []).map((booking) => [booking.id, Number(booking.price)]));
    const payStatus = new Map(
      (payments.data ?? [])
        .filter((payment) => payment.commission_transaction_id)
        .map((payment) => [payment.commission_transaction_id as string, payment.status]),
    );

    const charged = list
      .filter((row) => row.type === "commission_charge" && row.status === "confirmed")
      .reduce((sum, row) => sum + Number(row.amount_sar), 0);
    const paid = list
      .filter((row) => row.type === "payment" && row.status === "confirmed")
      .reduce((sum, row) => sum + Number(row.amount_sar), 0);

    const items: AdminCommissionRow[] = list.map((row) => ({
      id: row.id,
      driver_id: row.driver_id,
      driver_name: driverName.get(row.driver_id) ?? null,
      booking_id: row.booking_id,
      booking_amount: row.booking_id ? priceOf.get(row.booking_id) ?? null : null,
      amount_sar: Number(row.amount_sar),
      type: row.type,
      status: row.status,
      created_at: row.created_at,
      payment_status: payStatus.get(row.id) ?? null,
    }));

    return { items, totals: { outstanding: Math.max(charged - paid, 0), paid, generated: charged } };
  });

export type AdminPaymentRow = {
  id: string;
  driver_id: string;
  driver_name: string | null;
  amount_sar: number;
  amount_usd: number | null;
  status: string;
  provider: string;
  provider_reference: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
};

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPaymentRow[]> => {
    const db = await assertAdmin(context);
    const { data: rows } = await db
      .from("payment_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const list = rows ?? [];
    const driverIds = Array.from(new Set(list.map((row) => row.driver_id)));
    const { data: drivers } = driverIds.length
      ? await db.from("drivers").select("id, user_id").in("id", driverIds)
      : { data: [] };
    const { data: profiles } = (drivers ?? []).length
      ? await db.from("profiles").select("id, name").in("id", (drivers ?? []).map((driver) => driver.user_id))
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
    const driverName = new Map((drivers ?? []).map((driver) => [driver.id, nameOf.get(driver.user_id) ?? null]));

    return list.map((row) => ({
      id: row.id,
      driver_id: row.driver_id,
      driver_name: driverName.get(row.driver_id) ?? null,
      amount_sar: Number(row.amount_sar),
      amount_usd: row.amount_usd === null ? null : Number(row.amount_usd),
      status: row.status,
      provider: row.provider,
      provider_reference: row.provider_reference,
      tx_hash: row.tx_hash,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  });

export type AdminActivityRow = {
  id: string;
  admin_id: string;
  admin_name: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  created_at: string;
};

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminActivityRow[]> => {
    const db = await assertAdmin(context);
    const { data: rows } = await db
      .from("admin_activity_log")
      .select("id, admin_id, action, target_table, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    const list = rows ?? [];
    const adminIds = Array.from(new Set(list.map((row) => row.admin_id)));
    const { data: profiles } = adminIds.length
      ? await db.from("profiles").select("id, name, email").in("id", adminIds)
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((profile) => [profile.id, profile.name ?? profile.email]));
    return list.map((row) => ({ ...row, admin_name: nameOf.get(row.admin_id) ?? null }));
  });

export type AdminSettings = {
  paybis_enabled: boolean;
  crypto_asset: string;
  crypto_network: string;
  usd_rate_sar: number;
  min_payment_usd: number;
  wallet_configured: boolean;
  /** Masked form only — the full address never leaves the server. */
  wallet_masked: string | null;
  updated_at: string;
};

const maskWallet = (address: string | undefined) => {
  if (!address || address.length < 10) return null;
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
};

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSettings | null> => {
    const db = await assertAdmin(context);
    const { data } = await db.from("admin_settings").select("*").maybeSingle();
    if (!data) return null;
    const wallet = process.env["PAYOUT_WALLET_ADDRESS"];
    return {
      paybis_enabled: data.paybis_enabled,
      crypto_asset: data.crypto_asset,
      crypto_network: data.crypto_network,
      usd_rate_sar: Number(data.usd_rate_sar),
      min_payment_usd: Number(data.min_payment_usd),
      wallet_configured: Boolean(wallet) || data.wallet_configured,
      wallet_masked: maskWallet(wallet),
      updated_at: data.updated_at,
    };
  });

export const updateAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paybis_enabled: boolean; usd_rate_sar: number; min_payment_usd: number }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    if (!(data.usd_rate_sar > 0) || !(data.min_payment_usd >= 0)) return { ok: false as const };
    const { error } = await db
      .from("admin_settings")
      .update({
        paybis_enabled: data.paybis_enabled,
        usd_rate_sar: data.usd_rate_sar,
        min_payment_usd: data.min_payment_usd,
        updated_by: context.userId,
      })
      .eq("id", true);
    if (error) return { ok: false as const };
    await logAction(db, context.userId, "settings_changed", "admin_settings", null, {
      paybis_enabled: data.paybis_enabled,
    });
    return { ok: true as const };
  });
