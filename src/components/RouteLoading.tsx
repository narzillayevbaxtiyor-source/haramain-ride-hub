/**
 * Fallback shown while a route loads. Client-only routes (`ssr: false`) render
 * this on the server, so the initial HTML is never an empty white page.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      <p className="text-sm font-medium text-muted-foreground" role="status">
        Loading…
      </p>
    </div>
  );
}
