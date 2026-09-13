import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCommissions } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { useAdminLabels } from "@/components/admin/labels";
import { Badge, Cell, EmptyRow, PageHeading, Panel, Row, SearchBox, StatCard, Table, dateTime, money, shortId } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/commissions")({
  component: AdminCommissions,
});

function AdminCommissions() {
  const a = useAdminText();
  const labels = useAdminLabels();
  const fetchCommissions = useServerFn(listCommissions);
  const { data, isPending } = useQuery({ queryKey: ["admin", "commissions"], queryFn: () => fetchCommissions() });
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = data?.items ?? [];
    if (!needle) return items;
    return items.filter((row) =>
      [row.driver_name, row.booking_id].some((field) => (field ?? "").toLowerCase().includes(needle)),
    );
  }, [data, query]);

  return (
    <div>
      <PageHeading title={a.navCommissions} subtitle={a.commissionsSub} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label={a.totalOutstanding} value={money(data?.totals.outstanding ?? 0)} />
        <StatCard label={a.totalPaid} value={money(data?.totals.paid ?? 0)} />
        <StatCard label={a.totalGenerated} value={money(data?.totals.generated ?? 0)} />
      </div>
      <Panel action={<SearchBox value={query} onChange={setQuery} placeholder={a.searchDrivers} label={a.search} />}>
        <Table head={[a.driver, a.bookingId, a.bookingAmount, a.commissionAmount, a.status, a.createdAt]}>
          {isPending ? (
            <EmptyRow span={6} label={a.loading} />
          ) : rows.length === 0 ? (
            <EmptyRow span={6} label={a.none} />
          ) : (
            rows.map((row) => {
              const tone = labels.commissionStatus(row.type, row.status);
              return (
                <Row key={row.id}>
                  <Cell bold>
                    <Link to="/admin/drivers/$driverId" params={{ driverId: row.driver_id }} className="text-primary hover:underline">
                      {row.driver_name ?? "—"}
                    </Link>
                  </Cell>
                  <Cell>
                    {row.booking_id ? (
                      <Link to="/admin/bookings/$bookingId" params={{ bookingId: row.booking_id }} className="text-primary hover:underline">
                        {shortId(row.booking_id)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Cell>
                  <Cell>{row.booking_amount === null ? "—" : money(row.booking_amount)}</Cell>
                  <Cell bold>{money(row.amount_sar)}</Cell>
                  <Cell>
                    <Badge tone={tone.tone}>
                      {labels.txnType(row.type)} · {tone.label}
                    </Badge>
                  </Cell>
                  <Cell>{dateTime(row.created_at)}</Cell>
                </Row>
              );
            })
          )}
        </Table>
      </Panel>
    </div>
  );
}
