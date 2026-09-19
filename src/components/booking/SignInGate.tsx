import { useState } from "react";
import { useMyBookingText } from "@/lib/i18n-mybookings";
import { lovable } from "@/integrations/lovable/index";

/** Sign-in prompt for passengers. Bookings are always tied to a real account. */
export function SignInGate({ redirectTo, onBeforeSignIn }: { redirectTo: string; onBeforeSignIn?: () => void }) {
  const m = useMyBookingText();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setBusy(true);
    setFailed(false);
    onBeforeSignIn?.();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-bold text-card-foreground">{m.signInTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{m.signInText}</p>
      {failed ? <p role="alert" className="mt-3 text-sm font-medium text-destructive">{m.errGeneric}</p> : null}
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="mt-5 inline-flex min-h-13 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? m.loading : m.signInGoogle}
      </button>
    </div>
  );
}
