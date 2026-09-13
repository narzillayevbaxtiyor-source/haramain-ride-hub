import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDriverDetail, setDriverStatus, type BlockReason } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { useAdminLabels } from "@/components/admin/labels";
import {
  ActionButton, Badge, Cell, EmptyRow, PageHeading, Panel, Row, StatCard, Table, dateTime, money, shortId,
} from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/drivers/$driverId")({
  component: AdminDriverDetailPage,
});

function AdminDriverDetailPage() {
  const a = useAdminText();
  const labels = useAdminLabels();
  const { driverId } = useParams({ from: "/admin/drivers/$driverId" });
  const fetchDetail = useServerFn(getDriverDetail);
  const changeStatus = useServerFn(setDriverStatus);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState<BlockReason>("admin_suspension");

  const { data, isPending } = useQuery({
    queryKey: ["admin", "driver", driverId],
    queryFn: () => fetchDetail({ data: { driverId } }),
  });

  const mutation = useMutation({
    mutationFn: (input: { action: "approve" | "block" | "unblock" | "suspend" | "reactivate" }) =>
      changeStatus({ data: { driverId, action: input.action, reason: input.action === "block" || input.action === "suspend" ? blockReason : undefined } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.reason === "commission_outstanding" ? a.blockedByCommissionText : a.errGeneric);
        return;
      }
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => setError(a.errGeneric),
  });

  if (isPending) return <p className="text-sm text-muted-foreground">{a.loading}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">{a.none}</p>;

  const { driver, stats, commissions, payments } = data;
  const state = labels.driverStatus(driver.status);
  const isBlocked = driver.status === "blocked" || driver.status === "suspended";

  return (
    <div className="space-y-5">
      <Link to="/admin/drivers" className="inline-flex min-h-10 items-center text-sm font-bold text-primary">
        ← {a.back}
      </Link>
      <PageHeading title={driver.name ?? driver.plate_number ?? shortId(driver.id)} subtitle={driver.email ?? undefined} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={a.status} value={state.label} />
        <StatCard label={a.balance} value={money(driver.commission_balance_sar)} />
        <StatCard label={a.activeOffers} value={stats.activeOffers} />
        <StatCard label={a.bookingsCount} value={stats.bookings} hint={`${a.completed}: ${stats.completed} · ${a.cancelled}: ${stats.cancelled}`} />
      </div>

      {driver.blocked_by_commission ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {a.blockedByCommission}. {a.blockedByCommissionText}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={a.personal}>
          <dl className="space-y-2 text-sm">
            <Field label={a.name} value={driver.name ?? "—"} />
            <Field label={a.phone} value={driver.phone ?? "—"} />
            <Field label={a.verifiedPhone} value={driver.phone_verified ? a.yes : a.no} />
            <Field label={a.email} value={driver.email ?? "—"} />
            <Field label={a.registered} value={dateTime(driver.created_at)} />
          </dl>
        </Panel>

        <Panel title={a.vehicle}>
          <dl className="space-y-2 text-sm">
            <Field label={a.vehicleType} value={driver.vehicle_type} />
            <Field label={a.vehicleModel} value={driver.vehicle_model ?? "—"} />
            <Field label={a.plate} value={driver.plate_number ?? "—"} />
            <Field label={a.seats} value={String(driver.seats)} />
            <Field label={a.luggageCap} value={String(driver.luggage_capacity)} />
          </dl>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Photo label={a.exteriorPhoto} url={driver.exterior_url} fallback={a.noPhoto} />
            <Photo label={a.interiorPhoto} url={driver.interior_url} fallback={a.noPhoto} />
          </div>
        </Panel>
      </div>

      <Panel title={a.accountStatus}>
        <p className="text-sm text-muted-foreground">{a.blockText}</p>
        {driver.block_reason ? (
          <p className="mt-2 text-sm font-semibold text-foreground">
            {a.blockReason}: {driver.block_reason === "outstanding_commission" ? a.reasonCommission : driver.block_reason === "admin_suspension" ? a.reasonAdmin : a.reasonOther}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="block-reason">{a.reason}</label>
          <select
            id="block-reason"
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value as BlockReason)}
            className="min-h-11 rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground"
          >
            <option value="admin_suspension">{a.reasonAdmin}</option>
            <option value="outstanding_commission">{a.reasonCommission}</option>
            <option value="other">{a.reasonOther}</option>
          </select>
          {driver.status === "pending" ? (
            <ActionButton tone="primary" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "approve" })}>
              {a.approve}
            </ActionButton>
          ) : null}
          {!isBlocked ? (
            <>
              <ActionButton tone="danger" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "block" })}>
                {a.block}
              </ActionButton>
              <ActionButton tone="danger" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "suspend" })}>
                {a.suspend}
              </ActionButton>
            </>
          ) : (
            <ActionButton tone="primary" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: driver.status === "blocked" ? "unblock" : "reactivate" })}>
              {driver.status === "blocked" ? a.unblock : a.reactivate}
            </ActionButton>
          )}
        </div>
      </Panel>

      <Panel title={a.commissionHistory}>
        <Table head={[a.commissionAmount, a.status, a.bookingId, a.createdAt]}>
          {commissions.length === 0 ? (
            <EmptyRow span={4} label={a.none} />
          ) : (
            commissions.map((row) => {
              const tone = labels.commissionStatus(row.type, row.status);
              return (
                <Row key={row.id}>
                  <Cell bold>{money(Number(row.amount_sar))}</Cell>
                  <Cell>
                    <Badge tone={tone.tone}>{labels.txnType(row.type)} · {tone.label}</Badge>
                  </Cell>
                  <Cell>{row.booking_id ? shortId(row.booking_id) : "—"}</Cell>
                  <Cell>{dateTime(row.created_at)}</Cell>
                </Row>
              );
            })
          )}
        </Table>
      </Panel>

      <Panel title={a.paymentHistory}>
        <Table head={[a.paymentId, a.total, a.usdAmount, a.status, a.createdAt]}>
          {payments.length === 0 ? (
            <EmptyRow span={5} label={a.none} />
          ) : (
            payments.map((row) => {
              const tone = labels.paymentStatus(row.status);
              return (
                <Row key={row.id}>
                  <Cell bold>{shortId(row.id)}</Cell>
                  <Cell>{money(Number(row.amount_sar))}</Cell>
                  <Cell>{row.amount_usd === null ? "—" : money(Number(row.amount_usd), "USD")}</Cell>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Photo({ label, url, fallback }: { label: string; url: string | null; fallback: string }) {
  return (
    <figure>
      <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</figcaption>
      {url ? (
        <img src={url} alt={label} loading="lazy" className="h-36 w-full rounded-md border border-border object-cover" />
      ) : (
        <div className="grid h-36 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          {fallback}
        </div>
      )}
    </figure>
  );
}
