import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { DriverShell } from "@/components/driver/DriverShell";
import { NumberStepper, OptionButton, TextField } from "@/components/driver/DriverFields";
import { PhotoUpload } from "@/components/driver/PhotoUpload";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useDriverText } from "@/lib/i18n-driver";
import { lovable } from "@/integrations/lovable/index";
import {
  completeDriverRegistration,
  getDriverAccount,
  requestPhoneOtp,
  verifyPhoneOtp,
} from "@/lib/driver.functions";

export const Route = createFileRoute("/driver/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Driver Registration — Haramain 2 Airport" },
      { name: "description", content: "Register your vehicle as an airport transfer driver in Makkah and Madinah: verify your phone, add vehicle details and photos." },
      { property: "og:title", content: "Driver Registration — Haramain 2 Airport" },
      { property: "og:description", content: "Verify your phone, add vehicle details and photos to start receiving airport transfers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriverRegister,
});

const TOTAL = 6;
const VEHICLE_TYPES = ["sedan", "suv", "minivan", "van"] as const;

function DriverRegister() {
  const d = useDriverText();
  const navigate = useNavigate();
  const { user, ready } = useDriverSession();

  const askOtp = useServerFn(requestPhoneOtp);
  const checkOtp = useServerFn(verifyPhoneOtp);
  const loadAccount = useServerFn(getDriverAccount);
  const finish = useServerFn(completeDriverRegistration);

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [fullName, setFullName] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("");
  const [vehicleClass, setVehicleClass] = useState<"economy" | "standard" | "comfort">("standard");
  const [vehicleModel, setVehicleModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [seats, setSeats] = useState(4);
  const [luggageCapacity, setLuggageCapacity] = useState(2);
  const [exteriorPhoto, setExteriorPhoto] = useState<string | null>(null);
  const [interiorPhoto, setInteriorPhoto] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    void loadAccount({}).then((account) => {
      if (account.driver) {
        void navigate({ to: "/driver/dashboard" });
        return;
      }
      if (account.profile.phone_verified && account.profile.phone) {
        setPhone(account.profile.phone);
        setPhoneVerified(true);
      }
      if (account.profile.name) setFullName(account.profile.name);
    });
  }, [ready, user, loadAccount, navigate]);

  const reasonMessage: Record<string, string> = {
    invalid_phone: d.invalidPhone,
    phone_taken: d.phoneTaken,
    invalid_code: d.invalidCode,
    need_phone: d.needPhone,
    need_name: d.needName,
    need_vehicle: d.needVehicle,
    need_photos: d.needPhotos,
    need_agreement: d.needAgree,
    plate_taken: d.plateTaken,
    already_registered: d.alreadyRegistered,
  };

  async function signInGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/driver/register`,
    });
    if (result.error) setError(d.error);
  }

  async function sendCode() {
    if (!user) return setError(d.needGoogle);
    setBusy(true);
    setError(null);
    const result = await askOtp({ data: { phone } });
    setBusy(false);
    if (!result.ok) return setError(reasonMessage[result.reason] ?? d.error);
    setCodeSent(true);
    setDevCode(result.code ?? null);
  }

  async function confirmCode() {
    setBusy(true);
    setError(null);
    const result = await checkOtp({ data: { phone, code } });
    setBusy(false);
    if (!result.ok) return setError(reasonMessage[result.reason] ?? d.error);
    setPhoneVerified(true);
    setDevCode(null);
    setStep(2);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await finish({
      data: {
        fullName,
        vehicleType,
        vehicleClass,
        vehicleModel,
        plateNumber,
        seats,
        luggageCapacity,
        exteriorPhoto: exteriorPhoto ?? "",
        interiorPhoto: interiorPhoto ?? "",
        commissionAgreed: agreed,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setError(reasonMessage[result.reason] ?? d.error);
      if (result.reason === "plate_taken" || result.reason === "need_vehicle") setStep(3);
      if (result.reason === "need_photos") setStep(4);
      if (result.reason === "need_name") setStep(2);
      return;
    }
    setStep(6);
  }

  const titles = [
    { title: d.accountTitle, subtitle: d.accountBody },
    { title: d.personalTitle, subtitle: d.personalBody },
    { title: d.vehicleTitle, subtitle: d.vehicleBody },
    { title: d.photosTitle, subtitle: d.photosBody },
    { title: d.commissionTitle, subtitle: d.commissionBody },
    { title: d.doneTitle, subtitle: d.doneBody },
  ];
  const heading = titles[step - 1] ?? titles[0]!;

  const canContinue =
    step === 1 ? phoneVerified :
    step === 2 ? fullName.trim().length > 1 :
    step === 3 ? Boolean(vehicleType && vehicleModel.trim() && plateNumber.trim()) :
    step === 4 ? Boolean(exteriorPhoto && interiorPhoto) :
    step === 5 ? agreed : true;

  return (
    <DriverShell
      step={step}
      total={TOTAL}
      title={heading.title}
      subtitle={heading.subtitle}
      error={error}
      {...(step > 1 && step < 6 ? { onBack: () => { setError(null); setStep(step - 1); } } : {})}
      {...(step < 6
        ? {
            onContinue: () => {
              setError(null);
              if (!canContinue) {
                setError(
                  step === 1 ? (user ? d.needPhone : d.needGoogle) :
                  step === 2 ? d.needName :
                  step === 3 ? d.needVehicle :
                  step === 4 ? d.needPhotos : d.needAgree,
                );
                return;
              }
              if (step === 5) return void submit();
              setStep(step + 1);
            },
            continueLabel: step === 5 ? (busy ? d.loading : d.finish) : undefined,
            continueDisabled: busy,
          }
        : {})}
    >
      {step === 1 ? (
        <div className="space-y-5">
          {user ? (
            <p className="rounded-md border border-border bg-secondary px-4 py-3 text-sm text-foreground">
              <span className="font-semibold">{d.signedInAs}:</span> {user.email}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void signInGoogle()}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {d.continueGoogle}
            </button>
          )}

          {user && !phoneVerified ? (
            <div className="space-y-4">
              <TextField label={d.phoneLabel} value={phone} onChange={setPhone} placeholder={d.phonePlaceholder} inputMode="tel" />
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={busy}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-input px-5 text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {codeSent ? d.resend : d.sendCode}
              </button>
              {codeSent ? (
                <>
                  <p className="rounded-md border border-border bg-secondary px-4 py-3 text-xs leading-6 text-muted-foreground">
                    {d.smsNotice}
                    {devCode ? <><br /><span className="font-bold text-foreground">{d.devCode}: {devCode}</span></> : null}
                  </p>
                  <TextField label={d.codeLabel} value={code} onChange={setCode} placeholder="000000" inputMode="numeric" />
                  <button
                    type="button"
                    onClick={() => void confirmCode()}
                    disabled={busy || code.trim().length !== 6}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {d.verify}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {phoneVerified ? (
            <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-semibold text-foreground">
              <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
              {d.phoneVerified}: {phone}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <TextField label={d.fullName} value={fullName} onChange={setFullName} placeholder={d.fullNamePlaceholder} />
          <TextField label={d.phoneLabel} value={phone} disabled hint={d.phoneFixed} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-card-foreground">{d.vehicleType}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {VEHICLE_TYPES.map((type) => (
                <OptionButton key={type} selected={vehicleType === type} label={d[type]} onClick={() => setVehicleType(type)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">{d.vehicleClass}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(["economy", "standard", "comfort"] as const).map((value) => (
                <OptionButton key={value} selected={vehicleClass === value} label={d[value]} onClick={() => setVehicleClass(value)} />
              ))}
            </div>
          </div>
          <TextField label={d.vehicleModel} value={vehicleModel} onChange={setVehicleModel} placeholder={d.vehicleModelPlaceholder} />
          <TextField label={d.plate} value={plateNumber} onChange={setPlateNumber} placeholder={d.platePlaceholder} />
          <NumberStepper label={d.seats} value={seats} min={1} max={16} onChange={setSeats} />
          <NumberStepper label={d.luggage} value={luggageCapacity} min={0} max={20} onChange={setLuggageCapacity} />
        </div>
      ) : null}

      {step === 4 && user ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <PhotoUpload label={d.exterior} kind="exterior" userId={user.id} path={exteriorPhoto} onUploaded={setExteriorPhoto} onError={setError} />
            <PhotoUpload label={d.interior} kind="interior" userId={user.id} path={interiorPhoto} onUploaded={setInteriorPhoto} onError={setError} />
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />{d.photosPrivate}
          </p>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-5">
          <p className="rounded-md border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-bold text-foreground">{d.commissionRate}</p>
          <label className="flex min-h-16 cursor-pointer items-start gap-3 rounded-md border border-input bg-card px-4 py-4">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 size-5 accent-[hsl(var(--primary))]" />
            <span className="text-sm font-semibold leading-6 text-card-foreground">{d.commissionAgree}</span>
          </label>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="space-y-5">
          <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-semibold text-foreground">
            <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />{d.doneBody}
          </p>
          <Link
            to="/driver/dashboard"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground"
          >
            {d.goDashboard}
          </Link>
        </div>
      ) : null}
    </DriverShell>
  );
}
