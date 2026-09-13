import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPayments } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { useAdminLabels } from "@/components/admin/labels";
import { Badge, Cell, EmptyRow, PageHeading, Panel, Row, SearchBox, Table, dateTime, money, shortId } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const a = useAdminText();
  const labels = useAdminLabels();
  const fetchPayments = useServerFn(listPayments);
  const { data, isPending } = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fetchPayments() });
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data ?? [];
    return (data ?? []).filter((row) =>
      [row.id, row.driver_name, row.provider_reference, row.tx_hash]
        .some((field) => (field ?? "").toLowerCase().includes(needle)),
    );
  }, [data, query]);

  return (
    <div>
      <PageHeading title={a.navPayments} subtitle={a.paymentsSub} />
      <Panel action={<SearchBox value={query} onChange={setQuery} placeholder={a.searchPayments} label={a.search} />}>
        <Table head={[a.paymentId, a.driver, a.total, a.usdAmount, a.txId, a.status, a.createdAt]}>
          {isPending ? (
            <EmptyRow span={7} label={a.loading} />
          ) : rows.length === 0 ? (
            <EmptyRow span={7} label={a.none} />
          ) : (
            rows.map((row) => {
              const tone = labels.paymentStatus(row.status);
              return (
                <Row key={row.id}>
                  <Cell bold>{shortId(row.id)}</Cell>
                  <Cell>
                    <Link to="/admin/drivers/$driverId" params={{ driverId: row.driver_id }} className="text-primary hover:underline">
                      {row.driver_name ?? "—"}
                    </Link>
                  </Cell>
                  <Cell>{money(row.amount_sar)}</Cell>
                  <Cell>{row.amount_usd === null ? "—" : money(row.amount_usd, "USD")}</Cell>
                  <Cell>{row.tx_hash ?? row.provider_reference ?? "—"}</Cell>
                  <Cell>
                    <Badge tone={tone.tone}>{tone.label}</Badge>
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
