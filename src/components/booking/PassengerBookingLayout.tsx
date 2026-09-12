import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { BookingProgress } from "./BookingProgress";
import { useBookingText } from "@/lib/i18n-booking";

type Props = {
  step: number;
  total: number;
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  aside?: ReactNode | undefined;
  error?: string | null | undefined;
  onBack?: (() => void) | undefined;
  onContinue?: (() => void) | undefined;
  continueLabel?: string | undefined;
  continueDisabled?: boolean | undefined;
  hideNav?: boolean | undefined;
};

export function PassengerBookingLayout({
  step, total, title, subtitle, children, aside, error, onBack, onContinue, continueLabel, continueDisabled, hideNav,
}: Props) {
  const b = useBookingText();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-26 sm:px-6 sm:pt-32 lg:pb-16">
        <BookingProgress step={step} total={total} />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-8">
            <h1 className="font-display text-2xl font-bold text-card-foreground sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
            {error ? (
              <p role="alert" className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
            {!hideNav ? (
              <div className="mt-8 hidden gap-3 lg:flex">
                {onBack ? (
                  <button type="button" onClick={onBack} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-input px-5 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
                    <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />{b.back}
                  </button>
                ) : null}
                {onContinue ? (
                  <button type="button" onClick={onContinue} disabled={continueDisabled} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">
                    {continueLabel ?? b.continue}<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
          {aside ? <aside className="lg:sticky lg:top-28">{aside}</aside> : null}
        </div>
      </main>

      {!hideNav && (onBack || onContinue) ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-5xl gap-3">
            {onBack ? (
              <button type="button" onClick={onBack} aria-label={b.back} className="grid min-h-13 w-13 place-items-center rounded-md border border-input text-foreground">
                <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
              </button>
            ) : null}
            {onContinue ? (
              <button type="button" onClick={onContinue} disabled={continueDisabled} className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-bold text-primary-foreground disabled:opacity-60">
                {continueLabel ?? b.continue}<ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
}
