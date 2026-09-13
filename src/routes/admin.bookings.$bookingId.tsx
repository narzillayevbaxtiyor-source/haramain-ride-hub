import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminCancelBooking, getBookingDetail } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { useAdminLabels } from "@/components/admin/labels";
import { ActionButton, Badge, Cell, EmptyRow, PageHeading, Panel, Row, Table, dateTime, money, shortId } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/bookings/$bookingId")({
  component: AdminBookingDetailPage,
});

function AdminBookingDetailPage() {
  const a = useAdminText();
  const labels = useAdminLabels();
  const { bookingId } = useParams({ from: "/admin/bookings/$bookingId" });
  const fetchDetail = useServerFn(getBookingDetail);
  const cancelBooking = useServerFn(adminCancelBooking);
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "booking", bookingId],
    queryFn: () => fetchDetail({ data: { bookingId } }),
  });

  const mutation = useMutation({
    mutationFn: () => cancelBooking({ data: { bookingId, reason } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.reason === "not_allowed" ? a.cancelNotAllowed : a.errGeneric);
        return;
      }
      setError(null);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => setError(a.errGeneric),
  });

  if (isPending) return <p className="text-sm text-muted-foreground">{a.loading}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">{a.none}</p>;

  const { booking, commission, history } = data;
  const state = labels.bookingStatus(booking.status);
  const closed = ["completed", "cancelled", "rejected"].includes(booking.status);

  return (
    <div className="space-y-5">
      <Link to="/admin/bookings" className="inline-flex min-h-10 items-center text-sm font-bold text-primary">
        ← {a.back}
      </Link>
      <PageHeading title={`${a.bookingId}: ${shortId(booking.id)}`} subtitle={dateTime(booking.created_at)} />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={state.tone}>{state.label}</Badge>
        <span className="font-display text-xl font-bold text-foreground">{money(booking.price, booking.currency)}</span>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={a.navBookings}>
          <dl className="space-y-2 text-sm">
            <Field label={a.passenger} value={booking.passenger_name ?? "—"} />
            <Field label={a.driver} value={booking.driver_name ?? "—"} />
            <Field label={a.pickupCity} value={labels.city(booking.pickup_city)} />
            <Field label={a.pickupLocation} value={booking.pickup_location} />
            <Field label={a.destination} value={labels.airport(booking.destination_airport)} />
            <Field label={a.date} value={booking.date} />
            <Field label={a.time} value={booking.time.slice(0, 5)} />
            <Field label={a.rideType} value={labels.rideType(booking.ride_type)} />
            <Field label={a.adults} value={String(booking.adults)} />
            <Field label={a.children} value={String(booking.children)} />
            <Field label={a.luggage} value={`${booking.large_luggage} + ${booking.hand_luggage}`} />
          </dl>
        </Panel>

        <div className="space-y-5">
          <Panel title={a.vehicle}>
            <dl className="space-y-2 text-sm">
              <Field label={a.vehicleType} value={booking.vehicle_type ?? "—"} />
              <Field label={a.vehicleModel} value={booking.vehicle_model ?? "—"} />
              <Field label={a.plate} value={booking.plate_number ?? "—"} />
            </dl>
          </Panel>

          <Panel title={a.commission}>
            <dl className="space-y-2 text-sm">
              <Field label={a.commissionAmount} value={commission ? money(commission.amount_sar) : "—"} />
              <Field label={a.status} value={commission ? labels.commissionStatus("commission_charge", commission.status).label : "—"} />
            </dl>
          </Panel>

          <Panel title={a.adminCancel}>
            <p className="text-sm text-muted-foreground">{closed ? a.cancelNotAllowed : a.adminCancelText}</p>
            {!closed ? (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.reason}</span>
                  <input
                    type="text"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <ActionButton tone="danger" disabled={mutation.isPending || reason.trim().length < 3} onClick={() => mutation.mutate()}>
                  {a.confirm}
                </ActionButton>
              </div>
            ) : booking.cancellation_reason ? (
              <p className="mt-2 text-sm font-semibold text-foreground">{booking.cancellation_reason}</p>
            ) : null}
          </Panel>
        </div>
      </div>

      <Panel title={a.statusHistory}>
        <Table head={[a.status, a.reason, a.when]}>
          {history.length === 0 ? (
            <EmptyRow span={3} label={a.none} />
          ) : (
            history.map((entry) => {
              const tone = labels.bookingStatus(entry.status);
              return (
                <Row key={entry.id}>
                  <Cell bold>
                    <Badge tone={tone.tone}>{tone.label}</Badge>
                  </Cell>
                  <Cell>{entry.note ?? "—"}</Cell>
                  <Cell>{dateTime(entry.created_at)}</Cell>
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
