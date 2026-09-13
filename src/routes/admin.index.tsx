import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";
import { useAdminText } from "@/lib/i18n-admin";
import { PageHeading, StatCard, money } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const a = useAdminText();
  const fetchStats = useServerFn(getAdminStats);
  const { data, isPending } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => fetchStats() });

  return (
    <div>
      <PageHeading title={a.overview} subtitle={a.overviewSub} />
      {isPending || !data ? (
        <p className="text-sm text-muted-foreground">{a.loading}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={a.totalPassengers} value={data.passengers} />
          <StatCard label={a.totalDrivers} value={data.drivers} />
          <StatCard label={a.activeDrivers} value={data.driversActive} />
          <StatCard label={a.pendingDrivers} value={data.driversPending} />
          <StatCard label={a.blockedDrivers} value={data.driversBlocked} />
          <StatCard label={a.suspendedDrivers} value={data.driversSuspended} />
          <StatCard label={a.totalBookings} value={data.bookings} />
          <StatCard label={a.pendingBookings} value={data.bookingsPending} />
          <StatCard label={a.activeTrips} value={data.tripsActive} />
          <StatCard label={a.completedTrips} value={data.tripsCompleted} />
          <StatCard label={a.cancelledTrips} value={data.tripsCancelled} />
          <StatCard label={a.bookingRevenue} value={money(data.revenue)} />
          <StatCard label={a.outstandingCommission} value={money(data.commissionOutstanding)} />
          <StatCard label={a.paidCommission} value={money(data.commissionPaid)} />
          <StatCard label={a.pendingPayments} value={data.paymentsPending} />
        </div>
      )}
    </div>
  );
}
