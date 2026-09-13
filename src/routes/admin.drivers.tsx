import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDrivers } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { useAdminLabels } from "@/components/admin/labels";
import { Badge, Cell, EmptyRow, PageHeading, Panel, Row, SearchBox, Table, money } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/drivers")({
  component: AdminDrivers,
});

const FILTERS = ["all", "pending", "active", "blocked", "suspended"] as const;

function AdminDrivers() {
  const a = useAdminText();
  const labels = useAdminLabels();
  const fetchDrivers = useServerFn(listDrivers);
  const { data, isPending } = useQuery({ queryKey: ["admin", "drivers"], queryFn: () => fetchDrivers() });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data ?? []).filter((driver) => {
      const matchesStatus =
        status === "all" ||
        (status === "active" ? driver.status === "active" || driver.status === "approved" : driver.status === status);
      if (!matchesStatus) return false;
      if (!needle) return true;
      return [driver.name, driver.phone, driver.email, driver.plate_number]
        .some((field) => (field ?? "").toLowerCase().includes(needle));
    });
  }, [data, query, status]);

  return (
    <div>
      <PageHeading title={a.navDrivers} subtitle={a.driversSub} />
      <Panel
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} placeholder={a.searchDrivers} label={a.search} />
            <label className="sr-only" htmlFor="driver-status">{a.filter}</label>
            <select
              id="driver-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof FILTERS)[number])}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground"
            >
              {FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? a.all : labels.driverStatus(value).label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <Table head={[a.name, a.phone, a.vehicle, a.plate, a.status, a.balance, a.registered, ""]}>
          {isPending ? (
            <EmptyRow span={8} label={a.loading} />
          ) : rows.length === 0 ? (
            <EmptyRow span={8} label={a.none} />
          ) : (
            rows.map((driver) => {
              const state = labels.driverStatus(driver.status);
              return (
                <Row key={driver.id}>
                  <Cell bold>{driver.name ?? "—"}</Cell>
                  <Cell>{driver.phone ?? "—"}</Cell>
                  <Cell>
                    {driver.vehicle_type}
                    {driver.vehicle_model ? ` · ${driver.vehicle_model}` : ""}
                  </Cell>
                  <Cell>{driver.plate_number ?? "—"}</Cell>
                  <Cell>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </Cell>
                  <Cell bold>{money(Number(driver.commission_balance_sar))}</Cell>
                  <Cell>{new Date(driver.created_at).toLocaleDateString()}</Cell>
                  <Cell>
                    <Link
                      to="/admin/drivers/$driverId"
                      params={{ driverId: driver.id }}
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
