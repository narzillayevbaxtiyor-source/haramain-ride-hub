# Step 6 — Secure Admin Panel

A real admin area at `/admin`, reading and writing only your live data. No demo records, no changes to Home, the passenger flow, the driver registration or the driver dashboard.

## Access

- A separate roles list decides who is an administrator. Being an admin is never stored on a person's normal profile, so a passenger or driver cannot make themselves one.
- Every admin screen and every admin action re-checks the role on the server. Hiding the link is not the protection.
- Non-admins who open `/admin` are turned away; drivers and passengers keep seeing only their own data exactly as today.
- The first administrator is granted by you (I'll add the account you name, or you tell me the email after signing in once).

## Screens

Sidebar on desktop, compact menu on mobile:

- **Dashboard** — live counts: passengers, drivers (active / pending / blocked / suspended), bookings (pending / active / completed / cancelled), booking revenue, outstanding commission, paid commission, pending payments.
- **Drivers** — searchable table (name, phone, email, vehicle, plate, seats, luggage, status, joined, commission balance) with Approve, Block, Unblock, Suspend, Reactivate.
- **Driver detail** — personal, vehicle (with the two private photos shown through short-lived secure links), and business figures: active offers, bookings, completed, cancelled, commission balance, commission history, payment history.
- **Passengers** — name, email, phone, joined, bookings, completed, cancelled, status; Suspend and Reactivate.
- **Bookings** — filters by status, date, driver, passenger, pickup city, destination, private/shared, plus search by booking number; full detail page with the complete status history and timestamps.
- **Commissions** — driver, booking, booking amount, commission, status, dates, totals outstanding / paid / generated.
- **Payments** — payment number, driver, commission amount, USD amount, status, transaction reference, created and completed dates. Read-only; nothing can be marked paid by hand.
- **Offers** — all offers with driver, route, ride type, price, vehicle, capacity, status, created date; admin can deactivate (never delete history).
- **Activity log** — every admin action with who, what, which record and when.
- **Settings** — payment configuration status: Paybis connection state, fixed USDT TRC-20 network, USD settings. The wallet destination is kept server-side and only its masked form is shown. No keys or seed phrases anywhere.

## Blocking rules

- A block always carries a reason (outstanding commission, admin suspension, other) and it is visible in the panel.
- If the account was blocked automatically because commission reached 400 SAR, a plain unblock will not release it — the balance must be cleared first. Admin suspensions can be lifted normally.
- Blocked and suspended drivers still cannot create offers, accept bookings, or appear in passenger search.

## Bookings safety

Admin cannot jump a trip to an arbitrary state. Only a deliberate administrative cancellation is possible, it asks for confirmation and a reason, and it is written into the booking's history and the activity log.

## Languages

English default, plus Russian, Uzbek and Arabic with full right-to-left. Every label, status and message translated; no flags.

## Technical notes

- Migration: `app_role`-based `user_roles` table + `has_role()` security-definer function; `drivers.block_reason`, `drivers.blocked_by_commission`; `profiles.account_status` (active/suspended); `admin_activity_log`; `admin_settings` (single row, non-sensitive config only). Admin-read RLS policies added on existing tables via `has_role(auth.uid(),'admin')` — no table duplication, no schema rewrites.
- New `src/lib/admin.functions.ts`: server functions using `requireSupabaseAuth`, each verifying admin role before touching data; privileged reads via the service client only after that check.
- New `src/lib/i18n-admin.ts` for the four languages.
- New routes `src/routes/admin.*` with an admin shell (sidebar + mobile nav) reusing existing design tokens.
- Existing `driver_offers`, `bookings`, `commission_transactions`, `payment_transactions` relationships untouched; Paybis checkout deferred to Step 7.
