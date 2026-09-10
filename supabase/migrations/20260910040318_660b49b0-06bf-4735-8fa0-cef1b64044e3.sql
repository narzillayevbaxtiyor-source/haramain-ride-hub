DROP VIEW public.public_driver_offers;

CREATE POLICY "offers_public_read" ON public.driver_offers FOR SELECT TO anon USING (status = 'active');
GRANT SELECT (id, driver_id, pickup_city, pickup_location, destination_airport, date, time, ride_type, price, status) ON public.driver_offers TO anon;

CREATE POLICY "drivers_public_read" ON public.drivers FOR SELECT TO anon USING (status = 'approved');
GRANT SELECT (id, user_id, vehicle_type, vehicle_model, seats, luggage_capacity, status, rating) ON public.drivers TO anon;

CREATE POLICY "profiles_public_driver_read" ON public.profiles FOR SELECT TO anon USING (role = 'driver');
GRANT SELECT (id, name, avatar_url, role) ON public.profiles TO anon;

CREATE VIEW public.public_driver_offers WITH (security_invoker = true) AS
SELECT
  o.id,
  o.driver_id,
  o.pickup_city,
  o.pickup_location,
  o.destination_airport,
  o.date,
  o.time,
  o.ride_type,
  o.price,
  d.vehicle_type,
  d.vehicle_model,
  d.seats,
  d.luggage_capacity,
  d.rating,
  p.name AS driver_name,
  p.avatar_url AS driver_avatar_url
FROM public.driver_offers o
JOIN public.drivers d ON d.id = o.driver_id
LEFT JOIN public.profiles p ON p.id = d.user_id
WHERE o.status = 'active' AND d.status = 'approved';
GRANT SELECT ON public.public_driver_offers TO anon, authenticated;
GRANT ALL ON public.public_driver_offers TO service_role;