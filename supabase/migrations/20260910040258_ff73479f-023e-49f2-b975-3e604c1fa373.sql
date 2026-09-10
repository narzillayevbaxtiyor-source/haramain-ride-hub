CREATE TYPE public.app_role AS ENUM ('passenger','driver','admin');
CREATE TYPE public.pickup_city AS ENUM ('makkah','madinah');
CREATE TYPE public.destination_airport AS ENUM ('jeddah','madinah','taif');
CREATE TYPE public.ride_type AS ENUM ('private','shared');
CREATE TYPE public.offer_status AS ENUM ('active','paused','expired');
CREATE TYPE public.driver_status AS ENUM ('pending','approved','suspended');
CREATE TYPE public.booking_status AS ENUM ('pending','driver_accepted','driver_arriving','driver_arrived','trip_started','completed','cancelled');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'passenger',
  name TEXT,
  phone TEXT,
  email TEXT,
  language TEXT NOT NULL DEFAULT 'uz',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  vehicle_model TEXT,
  plate_number TEXT,
  seats INTEGER NOT NULL DEFAULT 4 CHECK (seats > 0),
  luggage_capacity INTEGER NOT NULL DEFAULT 2 CHECK (luggage_capacity >= 0),
  status public.driver_status NOT NULL DEFAULT 'pending',
  rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
  commission_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers_select_own" ON public.drivers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "drivers_insert_own" ON public.drivers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "drivers_update_own" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.driver_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  pickup_city public.pickup_city NOT NULL,
  pickup_location TEXT,
  destination_airport public.destination_airport NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  ride_type public.ride_type NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  status public.offer_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_offers TO authenticated;
GRANT ALL ON public.driver_offers TO service_role;
ALTER TABLE public.driver_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_manage_own" ON public.driver_offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid()));
CREATE INDEX driver_offers_match_idx ON public.driver_offers (status, pickup_city, destination_airport, date, ride_type, price);
CREATE INDEX driver_offers_driver_idx ON public.driver_offers (driver_id);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.driver_offers(id) ON DELETE SET NULL,
  pickup_city public.pickup_city NOT NULL,
  pickup_location TEXT NOT NULL,
  destination_airport public.destination_airport NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  passengers INTEGER NOT NULL CHECK (passengers > 0),
  luggage INTEGER NOT NULL DEFAULT 0 CHECK (luggage >= 0),
  ride_type public.ride_type NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  status public.booking_status NOT NULL DEFAULT 'pending',
  contact_name TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT INSERT ON public.bookings TO anon;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_insert_guest" ON public.bookings FOR INSERT TO anon WITH CHECK (passenger_id IS NULL);
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT TO authenticated WITH CHECK (passenger_id IS NULL OR passenger_id = auth.uid());
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT TO authenticated USING (
  passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
);
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE TO authenticated USING (
  passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
) WITH CHECK (true);
CREATE INDEX bookings_passenger_idx ON public.bookings (passenger_id);
CREATE INDEX bookings_driver_idx ON public.bookings (driver_id);

CREATE VIEW public.public_driver_offers WITH (security_invoker = false) AS
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