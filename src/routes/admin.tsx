import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel — Haramain 2 Airport" },
      { name: "description", content: "Internal administration for Haramain 2 Airport: drivers, passengers, bookings, commissions and payouts." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Panel — Haramain 2 Airport" },
      { property: "og:description", content: "Internal administration area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
