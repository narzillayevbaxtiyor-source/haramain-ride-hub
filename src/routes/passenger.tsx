import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/landing/ComingSoonPage";
export const Route = createFileRoute("/passenger")({
  head: () => ({ meta: [{ title: "Passenger Transfers — Haramain 2 Airport" }, { name: "description", content: "Passenger airport transfer booking from Makkah and Madinah is coming soon." }, { property: "og:title", content: "Passenger Transfers — Haramain 2 Airport" }, { property: "og:description", content: "Passenger airport transfer booking from Makkah and Madinah is coming soon." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "canonical", href: "/passenger" }] }),
  component: () => <ComingSoonPage type="passenger" />,
});
