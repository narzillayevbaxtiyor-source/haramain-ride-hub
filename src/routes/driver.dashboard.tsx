import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { DriverShell } from "@/components/driver/DriverShell";
import { NumberStepper, OptionButton, TextField } from "@/components/driver/DriverFields";
import { PhotoUpload } from "@/components/driver/PhotoUpload";
import { BookingCard } from "@/components/driver/BookingCard";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useDriverText } from "@/lib/i18n-driver";
import { useDashboardText } from "@/lib/i18n-dashboard";
import { useMyBookingText } from "@/lib/i18n-mybookings";
import { useBookingLabels } from "@/lib/booking-labels";
import { supabase } from "@/integrations/supabase/client";
import type { Airport, PickupCity, RideType } from "@/lib/booking";
import {
  COMMISSION_BLOCK_THRESHOLD,
  createDriverOffer,
  deleteDriverOffer,
  getCommissionSummary,
  getDriverAccount,
  listDriverBookings,
  listDriverOffers,
  respondToBooking,
  setDriverOfferStatus,
  updateBookingStatus,
  updateDriverOffer,
  updateDriverProfile,
  type BookingStatus,
  type CommissionSummary,
  type DriverAccount,
  type DriverBooking,
  type DriverOfferRow,
} from "@/lib/driver.functions";

export const Route = createFileRoute("/driver/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Driver Dashboard — Haramain 2 Airport" },
      { name: "description", content: "Manage your booking requests, active trips, offers, vehicle profile and commission balance." },
      { property: "og:title", content: "Driver Dashboard — Haramain 2 Airport" },
      { property: "og:description", content: "Manage your booking requests, active trips, offers and commission balance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriverDashboard,
});

const VEHICLE_TYPES = ["sedan", "suv", "minivan", "van"] as const;
const CITIES: PickupCity[] = ["makkah", "madinah"];
const AIRPORTS: Airport[] = ["jeddah", "madinah", "taif"];

const ACTIVE_STATUSES: BookingStatus[] = ["driver_accepted", "driver_arriving", "driver_arrived", "trip_started"];

type Section = "overview" | "requests" | "active" | "completed" | "history" | "offers" | "profile" | "commission";

function DriverDashboard() {
  const d = useDriverText();
  const t = useDashboardText();
  const mb = useMyBookingText();
  const labels = useBookingLabels();
  const navigate = useNavigate();
  const { user, ready } = useDriverSession();

  const loadAccount = useServerFn(getDriverAccount);
  const loadOffers = useServerFn(listDriverOffers);
  const loadBookings = useServerFn(listDriverBookings);
  const loadCommission = useServerFn(getCommissionSummary);
  const saveProfile = useServerFn(updateDriverProfile);
  const addOffer = useServerFn(createDriverOffer);
  const editOffer = useServerFn(updateDriverOffer);
  const toggleOffer = useServerFn(setDriverOfferStatus);
  const removeOffer = useServerFn(deleteDriverOffer);
  const respond = useServerFn(respondToBooking);
  const advance = useServerFn(updateBookingStatus);

  const [section, setSection] = useState<Section>("overview");
  const [account, setAccount] = useState<DriverAccount | null>(null);
  const [offers, setOffers] = useState<DriverOfferRow[]>([]);
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [commission, setCommission] = useState<CommissionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [seats, setSeats] = useState(4);
  const [luggageCapacity, setLuggageCapacity] = useState(2);
  const [exteriorPhoto, setExteriorPhoto] = useState<string | null>(null);
  const [interiorPhoto, setInteriorPhoto] = useState<string | null>(null);

  const [offerId, setOfferId] = useState<string | null>(null);
  const [city, setCity] = useState<PickupCity>("makkah");
  const [airport, setAirport] = useState<Airport>("jeddah");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [rideType, setRideType] = useState<RideType>("private");
  const [price, setPrice] = useState("");

  const refresh = useCallback(async () => {
    const next = await loadAccount({});
    setAccount(next);
    if (next.driver) {
      setFullName(next.profile.name ?? "");
      setVehicleType(next.driver.vehicle_type);
      setVehicleModel(next.driver.vehicle_model ?? "");
      setPlateNumber(next.driver.plate_number ?? "");
      setSeats(next.driver.seats);
      setLuggageCapacity(next.driver.luggage_capacity);
      setExteriorPhoto(next.driver.exterior_photo);
      setInteriorPhoto(next.driver.interior_photo);
      setOffers(await loadOffers({}));
      setBookings(await loadBookings({}));
      setCommission(await loadCommission({}));
    }
  }, [loadAccount, loadOffers, loadBookings, loadCommission]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      void navigate({ to: "/driver/login" });
      return;
    }
    void refresh();
  }, [ready, user, navigate, refresh]);

  // Booking status changes are persisted in the database and streamed back here,
  // so both sides always read the same live state.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("driver-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const reasonMessage: Record<string, string> = {
    need_name: d.needName,
    need_vehicle: d.needVehicle,
    plate_taken: d.plateTaken,
    not_driver: d.notDriver,
    blocked: t.blockedAction,
    invalid: d.error,
    invalid_price: d.priceHint,
    invalid_transition: t.invalidTransition,
    duplicate: t.duplicateOffer,
    conflict: mb.errConflict,
    not_found: t.updateFailed,
  };

  if (!ready || !account) {
    return <DriverShell title={d.dashboardTitle}><p className="text-sm text-muted-foreground">{d.loading}</p></DriverShell>;
  }

  if (!account.driver) {
    return (
      <DriverShell title={d.dashboardTitle} subtitle={d.notDriver}>
        <Link to="/driver/register" className="inline-flex min-h-14 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground">
          {d.register}
        </Link>
      </DriverShell>
    );
  }

  const driver = account.driver;
  const blocked = driver.status === "blocked";
  const suspended = driver.status === "suspended";
  const restricted = blocked || suspended;
  const statusLabel =
    driver.status === "blocked" ? d.statusBlocked :
    driver.status === "suspended" ? d.statusSuspended :
    driver.status === "pending" ? d.statusPending : d.statusActive;

  const pending = bookings.filter((booking) => booking.status === "pending");
  const active = bookings.filter((booking) => ACTIVE_STATUSES.includes(booking.status));
  const completed = bookings.filter((booking) => booking.status === "completed");
  const history = bookings.filter((booking) => booking.status === "cancelled" || booking.status === "rejected");

  const tabs: { key: Section; label: string; count?: number }[] = [
    { key: "overview", label: t.overview },
    { key: "requests", label: t.requests, count: pending.length },
    { key: "active", label: t.active, count: active.length },
    { key: "completed", label: t.completed, count: completed.length },
    { key: "history", label: mb.tabCancelled, count: history.length },
    { key: "offers", label: t.offers, count: offers.length },
    { key: "profile", label: t.vehicleProfile },
    { key: "commission", label: t.commission },
  ];

  async function run(action: () => Promise<{ ok: boolean; reason?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(reasonMessage[result.reason ?? ""] ?? t.updateFailed);
      return false;
    }
    await refresh();
    return true;
  }

  async function handleSave() {
    setSaved(false);
    const ok = await run(() =>
      saveProfile({ data: { fullName, vehicleType, vehicleModel, plateNumber, seats, luggageCapacity, exteriorPhoto, interiorPhoto } }),
    );
    if (ok) {
      setEditing(false);
      setSaved(true);
    }
  }

  function resetOfferForm() {
    setOfferId(null);
    setDate("");
    setTime("");
    setPrice("");
  }

  async function handleSubmitOffer() {
    const payload = {
      pickupCity: city,
      destinationAirport: airport,
      date,
      time,
      rideType,
      price: Number(price),
    };
    const ok = await run(() => (offerId ? editOffer({ data: { id: offerId, ...payload } }) : addOffer({ data: payload })));
    if (ok) resetOfferForm();
  }

  function startEditOffer(offer: DriverOfferRow) {
    setOfferId(offer.id);
    setCity(offer.pickup_city);
    setAirport(offer.destination_airport);
    setDate(offer.date);
    setTime(offer.time.slice(0, 5));
    setRideType(offer.ride_type);
    setPrice(String(offer.price));
    setError(null);
  }

  const statCard = (label: string, value: string) => (
    <div key={label} className="rounded-lg border border-border bg-card p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-card-foreground">{value}</p>
    </div>
  );

  return (
    <DriverShell
      title={d.dashboardTitle}
      subtitle={t.welcome}
      wide
      error={error}
      aside={
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{d.accountStatus}</p>
            <p className={`mt-1.5 text-base font-bold ${restricted ? "text-destructive" : "text-primary"}`}>{statusLabel}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t.outstandingLbl}</p>
            <p className="mt-1.5 text-base font-bold text-card-foreground">
              {labels.price(driver.commission_balance_sar)} / {labels.price(COMMISSION_BLOCK_THRESHOLD)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{d.commissionRate}</p>
          </div>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); void navigate({ to: "/driver" }); }}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-input px-5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />{d.logout}
          </button>
        </div>
      }
    >
      {restricted ? (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-5">
          <p className="flex items-center gap-2 text-base font-bold text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />{blocked ? d.blockedTitle : d.statusSuspended}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">{blocked ? d.blockedBody : d.suspendedBody}</p>
          {blocked ? (
            <>
              <p className="mt-2 text-sm font-semibold text-foreground">{t.blockedReason}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {t.outstandingLbl}: {labels.price(driver.commission_balance_sar)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{d.blockedRules}</p>
              <button
                type="button"
                disabled
                title={d.paymentSoon}
                className="mt-4 inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground opacity-60"
              >
                {d.payCommission}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">{d.paymentSoon}</p>
            </>
          ) : null}
        </div>
      ) : null}

      <nav className="-mx-1 flex gap-2 overflow-x-auto pb-1" aria-label={d.dashboardTitle}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setSection(tab.key); setError(null); }}
            aria-current={section === tab.key ? "page" : undefined}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${
              section === tab.key ? "bg-primary text-primary-foreground" : "border border-input text-foreground hover:bg-secondary"
            }`}
          >
            {tab.label}
            {tab.count ? ` (${tab.count})` : ""}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {section === "overview" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {statCard(t.newRequestsCount, String(pending.length))}
            {statCard(t.activeCount, String(active.length))}
            {statCard(t.completedCount, String(completed.length))}
            {statCard(t.balance, labels.price(driver.commission_balance_sar))}
            {statCard(t.accountStatus, statusLabel)}
            {statCard(t.offers, String(offers.filter((offer) => offer.status === "active").length))}
          </div>
        ) : null}

        {section === "requests" ? (
          pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noRequests}</p>
          ) : (
            <ul className="space-y-4">
              {pending.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  busy={busy}
                  canAct={!restricted}
                  onAccept={() => void run(() => respond({ data: { id: booking.id, accept: true } }))}
                  onReject={() => {
                    const reason = window.prompt(mb.cancelReason) ?? "";
                    void run(() => respond({ data: { id: booking.id, accept: false, reason } }));
                  }}
                />
              ))}
            </ul>
          )
        ) : null}

        {section === "active" ? (
          active.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noActive}</p>
          ) : (
            <ul className="space-y-4">
              {active.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  busy={busy}
                  onAdvance={(status) => void run(() => advance({ data: { id: booking.id, status } }))}
                  onCancel={() => {
                    const reason = window.prompt(mb.cancelReason) ?? "";
                    void run(() => advance({ data: { id: booking.id, status: "cancelled", reason } }));
                  }}
                />
              ))}
            </ul>
          )
        ) : null}

        {section === "completed" ? (
          completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noCompleted}</p>
          ) : (
            <ul className="space-y-4">
              {completed.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
            </ul>
          )
        ) : null}

        {section === "history" ? (
          history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{mb.noBookingsText}</p>
          ) : (
            <ul className="space-y-4">
              {history.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
            </ul>
          )
        ) : null}


        {section === "offers" ? (
          <section>
            <p className="text-sm text-muted-foreground">{d.myOffersBody}</p>

            {!restricted ? (
              <div className="mt-5 space-y-5 rounded-md border border-border bg-secondary/40 p-4 sm:p-5">
                <p className="text-sm font-bold text-card-foreground">{offerId ? t.editOffer : d.newOffer}</p>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{d.city}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {CITIES.map((option) => (
                      <OptionButton key={option} selected={city === option} label={labels.city(option)} onClick={() => setCity(option)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{d.airport}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {AIRPORTS.map((option) => (
                      <OptionButton key={option} selected={airport === option} label={labels.airport(option)} onClick={() => setAirport(option)} />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-card-foreground">{d.date}</span>
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-13 w-full rounded-md border border-input bg-card px-4 text-base text-card-foreground" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-card-foreground">{d.time}</span>
                    <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 min-h-13 w-full rounded-md border border-input bg-card px-4 text-base text-card-foreground" />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{d.rideType}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <OptionButton selected={rideType === "private"} label={d.privateRide} onClick={() => setRideType("private")} />
                    <OptionButton selected={rideType === "shared"} label={d.sharedRide} onClick={() => setRideType("shared")} />
                  </div>
                </div>
                <TextField label={d.price} value={price} onChange={(next) => setPrice(next.replace(/[^\d.]/g, ""))} hint={d.priceHint} inputMode="numeric" />
                <p className="text-sm text-muted-foreground">
                  {t.capacity}: {driver.seats} · {driver.luggage_capacity} — {driver.vehicle_model ?? driver.vehicle_type}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleSubmitOffer()}
                    disabled={busy || !date || !time || !price}
                    className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-bold text-primary-foreground disabled:opacity-60"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {busy ? d.creating : offerId ? t.updateOffer : d.createOffer}
                  </button>
                  {offerId ? (
                    <button type="button" onClick={resetOfferForm} className="min-h-13 rounded-md border border-input px-5 text-sm font-bold text-foreground">
                      {d.cancel}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {offers.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">{d.noOffers}</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {offers.map((offer) => (
                  <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-card-foreground">
                        {labels.city(offer.pickup_city)} → {labels.airport(offer.destination_airport)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {offer.date} · {offer.time.slice(0, 5)} · {labels.ride(offer.ride_type)} ·{" "}
                        {offer.status === "active" ? t.offerActive : t.offerPaused}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-primary">{labels.price(offer.price)}</span>
                      {!restricted ? (
                        <>
                          <button
                            type="button"
                            aria-label={t.editOffer}
                            onClick={() => startEditOffer(offer)}
                            className="grid size-11 place-items-center rounded-md border border-input text-foreground"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run(() => toggleOffer({ data: { id: offer.id, status: offer.status === "active" ? "paused" : "active" } }))}
                            className="min-h-11 rounded-md border border-input px-3 text-xs font-bold text-foreground"
                          >
                            {offer.status === "active" ? t.pauseOffer : t.activateOffer}
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        aria-label={d.deleteOffer}
                        disabled={busy}
                        onClick={() => void run(async () => { await removeOffer({ data: { id: offer.id } }); return { ok: true }; })}
                        className="grid size-11 place-items-center rounded-md border border-input text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {section === "profile" ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-card-foreground">{t.vehicleProfile}</h2>
              <button
                type="button"
                onClick={() => { setEditing(!editing); setSaved(false); setError(null); }}
                className="min-h-11 rounded-md border border-input px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
              >
                {editing ? d.cancel : d.editProfile}
              </button>
            </div>

            {editing ? (
              <div className="mt-4 space-y-5">
                <TextField label={d.fullName} value={fullName} onChange={setFullName} />
                <TextField label={d.phoneLabel} value={account.profile.phone ?? ""} disabled hint={d.phoneFixed} />
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{d.vehicleType}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {VEHICLE_TYPES.map((type) => (
                      <OptionButton key={type} selected={vehicleType === type} label={d[type]} onClick={() => setVehicleType(type)} />
                    ))}
                  </div>
                </div>
                <TextField label={d.vehicleModel} value={vehicleModel} onChange={setVehicleModel} />
                <TextField label={d.plate} value={plateNumber} onChange={setPlateNumber} />
                <NumberStepper label={d.seats} value={seats} min={1} max={16} onChange={setSeats} />
                <NumberStepper label={d.luggage} value={luggageCapacity} min={0} max={20} onChange={setLuggageCapacity} />
                {user ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PhotoUpload label={d.exterior} kind="exterior" userId={user.id} path={exteriorPhoto} onUploaded={setExteriorPhoto} onError={setError} />
                    <PhotoUpload label={d.interior} kind="interior" userId={user.id} path={interiorPhoto} onUploaded={setInteriorPhoto} onError={setError} />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={busy}
                  className="inline-flex min-h-13 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground disabled:opacity-60"
                >
                  {d.save}
                </button>
              </div>
            ) : (
              <>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    [d.fullName, account.profile.name ?? "—"],
                    [d.phoneLabel, account.profile.phone ?? "—"],
                    [t.email, account.profile.email ?? "—"],
                    [d.vehicleType, d[driver.vehicle_type as (typeof VEHICLE_TYPES)[number]] ?? driver.vehicle_type],
                    [d.vehicleModel, driver.vehicle_model ?? "—"],
                    [d.plate, driver.plate_number ?? "—"],
                    [d.seats, String(driver.seats)],
                    [d.luggage, String(driver.luggage_capacity)],
                    [d.accountStatus, statusLabel],
                    [t.exteriorPhoto, driver.exterior_photo ? t.photoStored : "—"],
                    [t.interiorPhoto, driver.interior_photo ? t.photoStored : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-border bg-secondary/60 px-4 py-3">
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-card-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">{d.photosPrivate}</p>
              </>
            )}
            {saved ? <p className="mt-3 text-sm font-semibold text-primary">{d.saved}</p> : null}
          </section>
        ) : null}

        {section === "commission" ? (
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {statCard(t.totalCharged, labels.price(commission?.charged ?? 0))}
              {statCard(t.totalPaid, labels.price(commission?.paid ?? 0))}
              {statCard(t.outstandingLbl, labels.price(driver.commission_balance_sar))}
              {statCard(t.threshold, labels.price(COMMISSION_BLOCK_THRESHOLD))}
            </div>
            <p className="text-sm text-muted-foreground">{t.commissionOnCompleted}</p>
            {blocked ? (
              <p className="text-sm font-semibold text-destructive">
                {t.requiredPayment}: {labels.price(driver.commission_balance_sar)}
              </p>
            ) : null}

            <div>
              <h3 className="text-sm font-bold text-card-foreground">{d.commissionHistory}</h3>
              {!commission || commission.transactions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{d.noCommission}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {commission.transactions.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm">
                      <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
                      <span className="font-semibold text-card-foreground">
                        {row.type === "payment" ? t.txPayment : t.txCharge}
                      </span>
                      <span className="font-bold text-primary">{labels.price(row.amount_sar)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-card-foreground">{t.paymentHistory}</h3>
              {!commission || commission.payments.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{t.noPayments}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {commission.payments.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm">
                      <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
                      <span className="font-semibold text-card-foreground">{row.status}</span>
                      <span className="font-bold text-primary">{labels.price(row.amount_sar)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">{d.paymentSoon}</p>
            </div>
          </section>
        ) : null}
      </div>
    </DriverShell>
  );
}
