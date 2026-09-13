import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOffers, setOfferStatus } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { useAdminLabels } from "@/components/admin/labels";
import { ActionButton, Badge, Cell, EmptyRow, PageHeading, Panel, Row, SearchBox, Table, money } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/offers")({
  component: AdminOffers,
});

const FILTERS = ["all", "active", "paused", "expired"] as const;

function AdminOffers() {
  const a = useAdminText();
  const labels = useAdminLabels();
  const fetchOffers = useServerFn(listOffers);
  const changeStatus = useServerFn(setOfferStatus);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useQuery({ queryKey: ["admin", "offers"], queryFn: () => fetchOffers() });

  const mutation = useMutation({
    mutationFn: (input: { offerId: string; status: "active" | "paused" }) => changeStatus({ data: input }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(a.errGeneric);
        return;
      }
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => setError(a.errGeneric),
  });

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return [row.driver_name, row.vehicle_model, row.vehicle_type]
        .some((field) => (field ?? "").toLowerCase().includes(needle));
    });
  }, [data, query, status]);

  return (
    <div>
      <PageHeading title={a.navOffers} subtitle={a.offersSub} />
      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Panel
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} placeholder={a.searchDrivers} label={a.search} />
            <label className="sr-only" htmlFor="offer-status">{a.filter}</label>
            <select
              id="offer-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof FILTERS)[number])}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground"
            >
              {FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? a.all : labels.offerStatus(value).label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <Table head={[a.driver, a.vehicle, a.capacity, a.pickup, a.destination, a.date, a.rideType, a.price, a.status, ""]}>
          {isPending ? (
            <EmptyRow span={10} label={a.loading} />
          ) : rows.length === 0 ? (
            <EmptyRow span={10} label={a.none} />
          ) : (
            rows.map((row) => {
              const state = labels.offerStatus(row.status);
              return (
                <Row key={row.id}>
                  <Cell bold>
                    <Link to="/admin/drivers/$driverId" params={{ driverId: row.driver_id }} className="text-primary hover:underline">
                      {row.driver_name ?? "—"}
                    </Link>
                  </Cell>
                  <Cell>
                    {row.vehicle_type}
                    {row.vehicle_model ? ` · ${row.vehicle_model}` : ""}
                  </Cell>
                  <Cell>{`${row.seats} / ${row.luggage_capacity}`}</Cell>
                  <Cell>{labels.city(row.pickup_city)}</Cell>
                  <Cell>{labels.airport(row.destination_airport)}</Cell>
                  <Cell>
                    {row.date} {row.time.slice(0, 5)}
                  </Cell>
                  <Cell>{labels.rideType(row.ride_type)}</Cell>
                  <Cell bold>{money(row.price)}</Cell>
                  <Cell>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </Cell>
                  <Cell>
                    {row.status === "expired" ? null : (
                      <ActionButton
                        tone={row.status === "active" ? "danger" : "primary"}
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ offerId: row.id, status: row.status === "active" ? "paused" : "active" })}
                      >
                        {row.status === "active" ? a.deactivate : a.activate}
                      </ActionButton>
                    )}
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
