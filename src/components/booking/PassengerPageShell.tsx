import type { ReactNode } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

/** Page frame for the passenger booking area, reusing the site header and footer. */
export function PassengerPageShell({
  title,
  subtitle,
  children,
  error,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  error?: string | null | undefined;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-26 sm:px-6 sm:pt-32">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
        {error ? (
          <p role="alert" className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
