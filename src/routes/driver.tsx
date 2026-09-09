import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/landing/ComingSoonPage";
export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Driver Registration — Haramain 2 Airport" }, { name: "description", content: "Driver registration for Haramain 2 Airport transfers is coming soon." }, { property: "og:title", content: "Driver Registration — Haramain 2 Airport" }, { property: "og:description", content: "Driver registration for Haramain 2 Airport transfers is coming soon." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }], links: [{ rel: "canonical", href: "/driver" }] }),
  component: () => <ComingSoonPage type="driver" />,
});
