import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBookings } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { useAdminLabels } from "@/components/admin/labels";
import { Badge, Cell, EmptyRow, PageHeading, Panel, Row, SearchBox, Table, money, shortId } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookings,
});

const FILTERS = [
  "all",
  "pending",
  "driver_accepted",
  "driver_arriving",
  "driver_arrived",
  "trip_started",
  "completed",
  "cancelled",
  "rejected",
] as const;

function AdminBookings() {
  const a = useAdminText();
  const labels = useAdminLabels();
  const fetchBookings = useServerFn(listBookings);
  const { data, isPending } = useQuery({ queryKey: ["admin", "bookings"], queryFn: () => fetchBookings() });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return [row.id, row.passenger_name, row.driver_name, row.pickup_location]
        .some((field) => (field ?? "").toLowerCase().includes(needle));
    });
  }, [data, query, status]);

  return (
    <div>
      <PageHeading title={a.navBookings} subtitle={a.bookingsSub} />
      <Panel
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} placeholder={a.searchBookings} label={a.search} />
            <label className="sr-only" htmlFor="booking-status">{a.filter}</label>
            <select
              id="booking-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof FILTERS)[number])}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground"
            >
              {FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? a.all : labels.bookingStatus(value).label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <Table head={[a.bookingId, a.passenger, a.driver, a.pickup, a.destination, a.date, a.price, a.status, ""]}>
          {isPending ? (
            <EmptyRow span={9} label={a.loading} />
          ) : rows.length === 0 ? (
            <EmptyRow span={9} label={a.none} />
          ) : (
            rows.map((row) => {
              const state = labels.bookingStatus(row.status);
              return (
                <Row key={row.id}>
                  <Cell bold>{shortId(row.id)}</Cell>
                  <Cell>{row.passenger_name ?? "—"}</Cell>
                  <Cell>{row.driver_name ?? "—"}</Cell>
                  <Cell>{labels.city(row.pickup_city)}</Cell>
                  <Cell>{labels.airport(row.destination_airport)}</Cell>
                  <Cell>
                    {row.date} {row.time.slice(0, 5)}
                  </Cell>
                  <Cell bold>{money(row.price, row.currency)}</Cell>
                  <Cell>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </Cell>
                  <Cell>
                    <Link
                      to="/admin/bookings/$bookingId"
                      params={{ bookingId: row.id }}
                      className="inline-flex min-h-10 items-center rounded-md border border-input px-3 text-xs font-bold text-foreground hover:bg-secondary"
                    >
                      {a.view}
                    </Link>
                  </Cell>
                </Row>
              );
            })
          )}
        </Table>
      </Panel>
    </div>
  );
}
