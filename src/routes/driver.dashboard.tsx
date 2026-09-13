import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, LogOut, Plus, Trash2 } from "lucide-react";
import { DriverShell } from "@/components/driver/DriverShell";
import { NumberStepper, OptionButton, TextField } from "@/components/driver/DriverFields";
import { PhotoUpload } from "@/components/driver/PhotoUpload";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useDriverText } from "@/lib/i18n-driver";
import { useBookingLabels } from "@/lib/booking-labels";
import { supabase } from "@/integrations/supabase/client";
import type { Airport, PickupCity, RideType } from "@/lib/booking";
import {
  COMMISSION_BLOCK_THRESHOLD,
  createDriverOffer,
  deleteDriverOffer,
  getDriverAccount,
  listCommissionTransactions,
  listDriverOffers,
  updateDriverProfile,
  type CommissionRow,
  type DriverAccount,
  type DriverOfferRow,
} from "@/lib/driver.functions";

export const Route = createFileRoute("/driver/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Driver Dashboard — Haramain 2 Airport" },
      { name: "description", content: "Manage your driver profile, vehicle details and your own airport transfer prices." },
      { property: "og:title", content: "Driver Dashboard — Haramain 2 Airport" },
      { property: "og:description", content: "Manage your driver profile, vehicle details and your own transfer prices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriverDashboard,
});

const VEHICLE_TYPES = ["sedan", "suv", "minivan", "van"] as const;
const CITIES: PickupCity[] = ["makkah", "madinah"];
const AIRPORTS: Airport[] = ["jeddah", "madinah", "taif"];

function DriverDashboard() {
  const d = useDriverText();
  const labels = useBookingLabels();
  const navigate = useNavigate();
  const { user, ready } = useDriverSession();

  const loadAccount = useServerFn(getDriverAccount);
  const loadOffers = useServerFn(listDriverOffers);
  const loadCommission = useServerFn(listCommissionTransactions);
  const saveProfile = useServerFn(updateDriverProfile);
  const addOffer = useServerFn(createDriverOffer);
  const removeOffer = useServerFn(deleteDriverOffer);

  const [account, setAccount] = useState<DriverAccount | null>(null);
  const [offers, setOffers] = useState<DriverOfferRow[]>([]);
  const [commission, setCommission] = useState<CommissionRow[]>([]);
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
      setCommission(await loadCommission({}));
    }
  }, [loadAccount, loadOffers, loadCommission]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      void navigate({ to: "/driver/login" });
      return;
    }
    void refresh();
  }, [ready, user, navigate, refresh]);

  const reasonMessage: Record<string, string> = {
    need_name: d.needName,
    need_vehicle: d.needVehicle,
    plate_taken: d.plateTaken,
    not_driver: d.notDriver,
    blocked: d.blockedRules,
    invalid: d.error,
    invalid_price: d.priceHint,
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
  const statusLabel =
    driver.status === "blocked" ? d.statusBlocked :
    driver.status === "suspended" ? d.statusSuspended :
    driver.status === "pending" ? d.statusPending : d.statusActive;

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await saveProfile({
      data: {
        fullName, vehicleType, vehicleModel, plateNumber, seats, luggageCapacity,
        exteriorPhoto, interiorPhoto,
      },
    });
    setBusy(false);
    if (!result.ok) return setError(reasonMessage[result.reason] ?? d.error);
    setEditing(false);
    setSaved(true);
    await refresh();
  }

  async function handleAddOffer() {
    setBusy(true);
    setError(null);
    const result = await addOffer({
      data: {
        pickupCity: city,
        destinationAirport: airport,
        date,
        time,
        rideType,
        price: Number(price),
      },
    });
    setBusy(false);
    if (!result.ok) return setError(reasonMessage[result.reason] ?? d.error);
    setPrice("");
    setDate("");
    setTime("");
    await refresh();
  }

  async function handleRemove(id: string) {
    setBusy(true);
    await removeOffer({ data: { id } });
    setBusy(false);
    await refresh();
  }

  return (
    <DriverShell
      title={d.dashboardTitle}
      wide
      error={error}
      aside={
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{d.accountStatus}</p>
            <p className={`mt-1.5 text-base font-bold ${blocked || suspended ? "text-destructive" : "text-primary"}`}>{statusLabel}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">{d.outstanding}</p>
            <p className="mt-1.5 text-base font-bold text-card-foreground">
              {labels.price(driver.commission_balance_sar)} / {labels.price(COMMISSION_BLOCK_THRESHOLD)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{d.commissionRate}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <p className="text-sm font-bold text-card-foreground">{d.commissionHistory}</p>
            {commission.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{d.noCommission}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {commission.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
                    <span className="font-semibold text-card-foreground">{labels.price(row.amount_sar)}</span>
                  </li>
                ))}
              </ul>
            )}
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
      {blocked || suspended ? (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-5">
          <p className="flex items-center gap-2 text-base font-bold text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />{blocked ? d.blockedTitle : d.statusSuspended}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">{blocked ? d.blockedBody : d.suspendedBody}</p>
          {blocked ? (
            <>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {d.outstanding}: {labels.price(driver.commission_balance_sar)}
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

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-card-foreground">{d.profile}</h2>
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
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              [d.fullName, account.profile.name ?? "—"],
              [d.phoneLabel, account.profile.phone ?? "—"],
              [d.vehicleType, d[driver.vehicle_type as (typeof VEHICLE_TYPES)[number]] ?? driver.vehicle_type],
              [d.vehicleModel, driver.vehicle_model ?? "—"],
              [d.plate, driver.plate_number ?? "—"],
              [d.seats, String(driver.seats)],
              [d.luggage, String(driver.luggage_capacity)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-secondary/60 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-card-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {saved ? <p className="mt-3 text-sm font-semibold text-primary">{d.saved}</p> : null}
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-display text-lg font-bold text-card-foreground">{d.myOffers}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{d.myOffersBody}</p>

        {!blocked && !suspended ? (
          <div className="mt-5 space-y-5 rounded-md border border-border bg-secondary/40 p-4 sm:p-5">
            <p className="text-sm font-bold text-card-foreground">{d.newOffer}</p>
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
            <button
              type="button"
              onClick={() => void handleAddOffer()}
              disabled={busy || !date || !time || !price}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-bold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="size-4" aria-hidden="true" />{busy ? d.creating : d.createOffer}
            </button>
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
                    {offer.date} · {offer.time.slice(0, 5)} · {labels.ride(offer.ride_type)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-primary">{labels.price(offer.price)}</span>
                  <button
                    type="button"
                    aria-label={d.deleteOffer}
                    onClick={() => void handleRemove(offer.id)}
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
    </DriverShell>
  );
}
