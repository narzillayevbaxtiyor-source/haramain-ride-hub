-- profiles: verified phone as the unique driver identity
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;

-- drivers: photos, commission, timestamps
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS exterior_photo text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS interior_photo text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0.10;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS commission_balance_sar numeric NOT NULL DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS drivers_plate_unique
  ON public.drivers (lower(plate_number))
  WHERE plate_number IS NOT NULL AND status <> 'suspended';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drivers_set_updated_at ON public.drivers;
CREATE TRIGGER drivers_set_updated_at BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- commission transactions
DO $$ BEGIN
  CREATE TYPE public.commission_txn_type AS ENUM ('commission_charge', 'payment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.commission_txn_status AS ENUM ('pending', 'confirmed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.commission_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount_sar numeric NOT NULL,
  type public.commission_txn_type NOT NULL,
  status public.commission_txn_status NOT NULL DEFAULT 'pending',
  -- future MoonPay / USDT TRC-20 payment verification data
  payment_provider text,
  payment_reference text,
  amount_usd numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.commission_transactions TO authenticated;
GRANT ALL ON public.commission_transactions TO service_role;
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commission_select_own ON public.commission_transactions;
CREATE POLICY commission_select_own ON public.commission_transactions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = commission_transactions.driver_id AND d.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS commission_transactions_driver_idx ON public.commission_transactions (driver_id, created_at DESC);

DROP TRIGGER IF EXISTS commission_set_updated_at ON public.commission_transactions;
CREATE TRIGGER commission_set_updated_at BEFORE UPDATE ON public.commission_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- automatic block / unblock at the 400 SAR threshold
CREATE OR REPLACE FUNCTION public.apply_commission_block()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.commission_balance_sar >= 400 AND NEW.status IN ('active', 'approved', 'pending') THEN
    NEW.status = 'blocked';
  ELSIF NEW.commission_balance_sar < 400 AND NEW.status = 'blocked' THEN
    NEW.status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drivers_commission_block ON public.drivers;
CREATE TRIGGER drivers_commission_block BEFORE INSERT OR UPDATE OF commission_balance_sar, status ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.apply_commission_block();

-- recompute outstanding commission from confirmed records
CREATE OR REPLACE FUNCTION public.recalc_commission_balance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  target = COALESCE(NEW.driver_id, OLD.driver_id);
  UPDATE public.drivers d
  SET commission_balance_sar = COALESCE((
    SELECT SUM(CASE WHEN t.type = 'commission_charge' THEN t.amount_sar ELSE -t.amount_sar END)
    FROM public.commission_transactions t
    WHERE t.driver_id = target AND t.status = 'confirmed'
  ), 0)
  WHERE d.id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS commission_recalc ON public.commission_transactions;
CREATE TRIGGER commission_recalc AFTER INSERT OR UPDATE OR DELETE ON public.commission_transactions
FOR EACH ROW EXECUTE FUNCTION public.recalc_commission_balance();

-- phone verification codes (backend only)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS phone_verifications_lookup ON public.phone_verifications (user_id, phone, created_at DESC);

-- offers and passenger search must exclude blocked / suspended drivers
DROP POLICY IF EXISTS drivers_public_read ON public.drivers;
CREATE POLICY drivers_public_read ON public.drivers
FOR SELECT TO anon
USING (status IN ('approved', 'active'));

DROP VIEW IF EXISTS public.public_driver_offers;
CREATE VIEW public.public_driver_offers WITH (security_invoker = true) AS
SELECT o.id, o.driver_id, o.pickup_city, o.pickup_location, o.destination_airport,
       o.date, o.time, o.ride_type, o.price,
       d.vehicle_type, d.vehicle_model, d.seats, d.luggage_capacity, d.rating,
       p.name AS driver_name, p.avatar_url AS driver_avatar_url
FROM public.driver_offers o
JOIN public.drivers d ON d.id = o.driver_id
JOIN public.profiles p ON p.id = d.user_id
WHERE o.status = 'active' AND d.status IN ('approved', 'active');

GRANT SELECT ON public.public_driver_offers TO anon, authenticated;