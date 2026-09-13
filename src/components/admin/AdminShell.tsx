import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useDriverSession } from "@/hooks/useDriverSession";
import { useAdminText } from "@/lib/i18n-admin";
import { getAdminAccess } from "@/lib/admin.functions";
import { LanguageSelector } from "@/components/landing/LanguageSelector";

const NAV = [
  { to: "/admin", key: "navDashboard" },
  { to: "/admin/drivers", key: "navDrivers" },
  { to: "/admin/passengers", key: "navPassengers" },
  { to: "/admin/bookings", key: "navBookings" },
  { to: "/admin/offers", key: "navOffers" },
  { to: "/admin/commissions", key: "navCommissions" },
  { to: "/admin/payments", key: "navPayments" },
  { to: "/admin/activity", key: "navActivity" },
  { to: "/admin/settings", key: "navSettings" },
] as const;

/**
 * Admin area frame. Access is decided server-side by getAdminAccess (has_role);
 * this component only reflects that answer in the UI.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const a = useAdminText();
  const { session, ready } = useDriverSession();
  const [access, setAccess] = useState<"loading" | "granted" | "denied">("loading");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      setAccess("denied");
      return;
    }
    let active = true;
    setAccess("loading");
    getAdminAccess()
      .then((result) => {
        if (active) setAccess(result.isAdmin ? "granted" : "denied");
      })
      .catch(() => {
        if (active) setAccess("denied");
      });
    return () => {
      active = false;
    };
  }, [ready, session]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (!ready || access === "loading") {
    return <CenteredNotice title={a.loading} />;
  }

  if (!session) {
    return (
      <CenteredNotice title={a.signIn} text={a.signInText}>
        <button
          type="button"
          onClick={() => void lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          {a.continueGoogle}
        </button>
      </CenteredNotice>
    );
  }

  if (access === "denied") {
    return (
      <CenteredNotice title={a.noAccess} text={a.noAccessText}>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="inline-flex min-h-12 items-center rounded-md border border-input px-5 text-sm font-bold text-foreground hover:bg-secondary">
            {a.backToSite}
          </Link>
          <button type="button" onClick={() => void signOut()} className="inline-flex min-h-12 items-center rounded-md border border-input px-5 text-sm font-bold text-foreground hover:bg-secondary">
            {a.signOut}
          </button>
        </div>
      </CenteredNotice>
    );
  }

  const nav = (
    <nav aria-label={a.adminPanel} className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.to === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`min-h-11 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {a[item.key]}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={a.menu}
            aria-expanded={open}
            className="grid size-11 place-items-center rounded-md border border-input text-foreground lg:hidden"
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
          <p className="font-display text-base font-bold text-foreground">{a.adminPanel}</p>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSelector />
            <Link to="/" className="hidden min-h-10 items-center rounded-md border border-input px-3 text-xs font-bold text-foreground hover:bg-secondary sm:inline-flex">
              {a.backToSite}
            </Link>
            <button type="button" onClick={() => void signOut()} className="inline-flex min-h-10 items-center rounded-md border border-input px-3 text-xs font-bold text-foreground hover:bg-secondary">
              {a.signOut}
            </button>
          </div>
        </div>
        {open ? <div className="border-t border-border px-4 py-3 lg:hidden">{nav}</div> : null}
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">{nav}</div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function CenteredNotice({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-card">
        <h1 className="font-display text-xl font-bold text-card-foreground">{title}</h1>
        {text ? <p className="mt-2 text-sm text-muted-foreground">{text}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}
