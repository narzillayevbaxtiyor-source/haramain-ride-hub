[1mdiff --git a/src/components/admin/labels.ts b/src/components/admin/labels.ts[m
[1mindex e6f250c..a56f9a0 100644[m
[1m--- a/src/components/admin/labels.ts[m
[1m+++ b/src/components/admin/labels.ts[m
[36m@@ -79,7 +79,7 @@[m [mexport function useAdminLabels() {[m
   };[m
 [m
   const city = (value: string) => (value === "makkah" ? a.makkah : a.madinah);[m
[31m-  const airport = (value: string) => (value === "jeddah" ? a.jeddah : value === "taif" ? a.taif : a.madinahAirport);[m
[32m+[m[32m  const airport = (value: string) => (value === "jeddah" ? a.jeddah : a.madinahAirport);[m
   const rideType = (value: string) => (value === "shared" ? a.shared : a.private);[m
   const txnType = (value: string) => (value === "payment" ? a.typePayment : a.typeCharge);[m
 [m
[1mdiff --git a/src/components/booking/AirportSelector.tsx b/src/components/booking/AirportSelector.tsx[m
[1mindex ead6c34..2dcd230 100644[m
[1m--- a/src/components/booking/AirportSelector.tsx[m
[1m+++ b/src/components/booking/AirportSelector.tsx[m
[36m@@ -2,12 +2,12 @@[m [mimport { Check, Plane } from "lucide-react";[m
 import type { Airport } from "@/lib/booking";[m
 import { useBookingLabels } from "@/lib/booking-labels";[m
 [m
[31m-const airports: Airport[] = ["jeddah", "madinah", "taif"];[m
[32m+[m[32mconst airports: Airport[] = ["jeddah", "madinah"];[m
 [m
 export function AirportSelector({ value, onChange }: { value: Airport | null; onChange: (airport: Airport) => void }) {[m
   const labels = useBookingLabels();[m
   return ([m
[31m-    <div className="grid gap-3 sm:grid-cols-3">[m
[32m+[m[32m    <div className="grid gap-3 sm:grid-cols-2">[m
       {airports.map((airport) => {[m
         const selected = value === airport;[m
         return ([m
[1mdiff --git a/src/integrations/supabase/types.ts b/src/integrations/supabase/types.ts[m
[1mindex 096541f..1f0b51f 100644[m
[1m--- a/src/integrations/supabase/types.ts[m
[1m+++ b/src/integrations/supabase/types.ts[m
[36m@@ -632,7 +632,7 @@[m [mexport type Database = {[m
         | "rejected"[m
       commission_txn_status: "pending" | "confirmed" | "failed"[m
       commission_txn_type: "commission_charge" | "payment"[m
[31m-      destination_airport: "jeddah" | "madinah" | "taif"[m
[32m+[m[32m      destination_airport: "jeddah" | "madinah"[m
       driver_status: "pending" | "approved" | "suspended" | "active" | "blocked"[m
       offer_status: "active" | "paused" | "expired"[m
       payment_status:[m
[36m@@ -785,7 +785,7 @@[m [mexport const Constants = {[m
       ],[m
       commission_txn_status: ["pending", "confirmed", "failed"],[m
       commission_txn_type: ["commission_charge", "payment"],[m
[31m-      destination_airport: ["jeddah", "madinah", "taif"],[m
[32m+[m[32m      destination_airport: ["jeddah", "madinah"],[m
       driver_status: ["pending", "approved", "suspended", "active", "blocked"],[m
       offer_status: ["active", "paused", "expired"],[m
       payment_status: [[m
[1mdiff --git a/src/lib/booking-labels.ts b/src/lib/booking-labels.ts[m
[1mindex 2642903..f932ddd 100644[m
[1m--- a/src/lib/booking-labels.ts[m
[1m+++ b/src/lib/booking-labels.ts[m
[36m@@ -8,7 +8,7 @@[m [mexport function useBookingLabels() {[m
   return {[m
     city: (city: PickupCity) => (city === "makkah" ? t.makkah : t.madinah),[m
     airport: (airport: Airport) =>[m
[31m-      airport === "jeddah" ? t.jeddahAirport : airport === "madinah" ? t.madinahAirport : t.taifAirport,[m
[32m+[m[32m      airport === "jeddah" ? t.jeddahAirport : t.madinahAirport,[m
     ride: (ride: RideType) => (ride === "private" ? b.privateRide : b.sharedRide),[m
     price: (value: number) => `${Number(value).toLocaleString(language === "ar" ? "ar" : "en")} ${b.currency}`,[m
   };[m
[1mdiff --git a/src/lib/booking.ts b/src/lib/booking.ts[m
[1mindex 0b1fbba..7747cd5 100644[m
[1m--- a/src/lib/booking.ts[m
[1m+++ b/src/lib/booking.ts[m
[36m@@ -1,7 +1,7 @@[m
 import { supabase } from "@/integrations/supabase/client";[m
 [m
 export type PickupCity = "makkah" | "madinah";[m
[31m-export type Airport = "jeddah" | "madinah" | "taif";[m
[32m+[m[32mexport type Airport = "jeddah" | "madinah";[m
 export type RideType = "private" | "shared";[m
 export type VehicleClass = "economy" | "standard" | "comfort";[m
 [m
[1mdiff --git a/src/routes/driver.dashboard.tsx b/src/routes/driver.dashboard.tsx[m
[1mindex 382f759..5c2209c 100644[m
[1m--- a/src/routes/driver.dashboard.tsx[m
[1m+++ b/src/routes/driver.dashboard.tsx[m
[36m@@ -50,7 +50,7 @@[m [mexport const Route = createFileRoute("/driver/dashboard")({[m
 [m
 const VEHICLE_TYPES = ["sedan", "suv", "minivan", "van"] as const;[m
 const CITIES: PickupCity[] = ["makkah", "madinah"];[m
[31m-const AIRPORTS: Airport[] = ["jeddah", "madinah", "taif"];[m
[32m+[m[32mconst AIRPORTS: Airport[] = ["jeddah", "madinah"];[m
 [m
 const ACTIVE_STATUSES: BookingStatus[] = ["driver_accepted", "driver_arriving", "driver_arrived", "trip_started"];[m
 [m
[36m@@ -433,7 +433,7 @@[m [mfunction DriverDashboard() {[m
                 </div>[m
                 <div>[m
                   <p className="text-sm font-semibold text-card-foreground">{d.airport}</p>[m
[31m-                  <div className="mt-3 grid gap-3 sm:grid-cols-3">[m
[32m+[m[32m                  <div className="mt-3 grid gap-3 sm:grid-cols-2">[m
                     {AIRPORTS.map((option) => ([m
                       <OptionButton key={option} selected={airport === option} label={labels.airport(option)} onClick={() => setAirport(option)} />[m
                     ))}[m
[1mdiff --git a/src/routes/index.tsx b/src/routes/index.tsx[m
[1mindex 2b5c5e5..9683c8f 100644[m
[1m--- a/src/routes/index.tsx[m
[1m+++ b/src/routes/index.tsx[m
[36m@@ -14,9 +14,9 @@[m [mexport const Route = createFileRoute("/")({[m
   head: () => ({[m
     meta: [[m
       { title: "Haramain 2 Airport | Makkah & Madinah Airport Transfers" },[m
[31m-      { name: "description", content: "Book airport transfers from Makkah and Madinah to Jeddah, Madinah and Taif airports. Choose private or shared transportation with local drivers." },[m
[32m+[m[32m      { name: "description", content: "Book airport transfers from Makkah and Madinah to Jeddah and Madinah airports. Choose private or shared transportation with local drivers." },[m
       { property: "og:title", content: "Haramain 2 Airport | Makkah & Madinah Airport Transfers" },[m
[31m-      { property: "og:description", content: "Book airport transfers from Makkah and Madinah to Jeddah, Madinah and Taif airports. Choose private or shared transportation with local drivers." },[m
[32m+[m[32m      { property: "og:description", content: "Book airport transfers from Makkah and Madinah to Jeddah and Madinah airports. Choose private or shared transportation with local drivers." },[m
       { property: "og:type", content: "website" },[m
       { property: "og:url", content: "/" },[m
       { name: "twitter:card", content: "summary_large_image" },[m
[36m@@ -28,10 +28,10 @@[m [mexport const Route = createFileRoute("/")({[m
 [m
 function Index() {[m
   const { t } = useLanguage();[m
[31m-  const routes: { from: string; to: string }[] = [[m
[31m-    { from: t.makkah, to: t.jeddahAirport }, { from: t.makkah, to: t.madinahAirport }, { from: t.makkah, to: t.taifAirport },[m
[31m-    { from: t.madinah, to: t.jeddahAirport }, { from: t.madinah, to: t.taifAirport },[m
[31m-  ];[m
[32m+[m[32mconst routes: { from: string; to: string }[] = [[m
[32m+[m[32m      { from: t.makkah, to: t.jeddahAirport }, { from: t.makkah, to: t.madinahAirport },[m
[32m+[m[32m      { from: t.madinah, to: t.jeddahAirport },[m
[32m+[m[32m    ];[m
   const benefits = [[m
     { icon: MousePointerClick, title: t.easy, text: t.easyText },[m
     { icon: ShieldCheck, title: t.chooseDriver, text: t.chooseDriverText },[m
