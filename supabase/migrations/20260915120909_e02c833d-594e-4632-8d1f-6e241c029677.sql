CREATE TYPE public.vehicle_class AS ENUM ('economy', 'standard', 'comfort');

ALTER TABLE public.drivers ADD COLUMN vehicle_class public.vehicle_class NOT NULL DEFAULT 'standard';

DROP VIEW IF EXISTS public.public_driver_offers;

CREATE VIEW public.public_driver_offers
WITH (security_invoker = true) AS
SELECT o.id,
    o.driver_id,
    o.pickup_city,
    o.pickup_location,
    o.destination_airport,
    o.date,
    o."time",
    o.ride_type,
    o.price,
    d.vehicle_type,
    d.vehicle_model,
    d.vehicle_class,
    d.seats,
    d.luggage_capacity,
    d.rating,
    p.name AS driver_name,
    p.avatar_url AS driver_avatar_url
   FROM public.driver_offers o
     JOIN public.drivers d ON d.id = o.driver_id
     JOIN public.profiles p ON p.id = d.user_id
  WHERE o.status = 'active'::offer_status AND (d.status = ANY (ARRAY['approved'::driver_status, 'active'::driver_status]));

GRANT SELECT ON public.public_driver_offers TO anon, authenticated;