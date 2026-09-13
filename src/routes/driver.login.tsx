import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DriverShell } from "@/components/driver/DriverShell";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useDriverText } from "@/lib/i18n-driver";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/driver/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Driver Sign In — Haramain 2 Airport" },
      { name: "description", content: "Sign in to your Haramain 2 Airport driver account to manage your prices and vehicle details." },
      { property: "og:title", content: "Driver Sign In — Haramain 2 Airport" },
      { property: "og:description", content: "Sign in to your driver account to manage prices and vehicle details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriverLogin,
});

function DriverLogin() {
  const d = useDriverText();
  const navigate = useNavigate();
  const { user, ready } = useDriverSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) void navigate({ to: "/driver/dashboard" });
  }, [ready, user, navigate]);

  async function signIn() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/driver/dashboard`,
    });
    if (result.error) {
      setBusy(false);
      setError(d.error);
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/driver/dashboard" });
  }

  return (
    <DriverShell title={d.loginTitle} subtitle={d.loginBody} error={error}>
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy || !ready}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? d.loading : d.continueGoogle}
      </button>
      <p className="mt-5 text-sm text-muted-foreground">
        {d.noAccountYet}{" "}
        <Link to="/driver/register" className="font-bold text-primary underline-offset-4 hover:underline">
          {d.register}
        </Link>
      </p>
    </DriverShell>
  );
}
