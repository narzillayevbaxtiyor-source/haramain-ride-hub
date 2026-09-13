-- 1. New booking status value
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rejected';

-- 2. Booking detail columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS large_luggage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hand_luggage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS bookings_driver_status_idx ON public.bookings (driver_id, status);

-- 3. Booking status history
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status booking_status NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_status_history_booking_idx ON public.booking_status_history (booking_id, created_at);

GRANT SELECT ON public.booking_status_history TO authenticated;
GRANT ALL ON public.booking_status_history TO service_role;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS history_select_participants ON public.booking_status_history;
CREATE POLICY history_select_participants ON public.booking_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.drivers d ON d.id = b.driver_id
    WHERE b.id = booking_status_history.booking_id
      AND (b.passenger_id = auth.uid() OR d.user_id = auth.uid())
  ));

-- 4. Payment transactions (Paybis / USDT TRC-20 foundation)
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  commission_transaction_id uuid REFERENCES public.commission_transactions(id) ON DELETE SET NULL,
  amount_sar numeric NOT NULL,
  amount_usd numeric,
  provider text NOT NULL DEFAULT 'paybis',
  provider_reference text,
  status payment_status NOT NULL DEFAULT 'pending',
  crypto_asset text NOT NULL DEFAULT 'USDT',
  crypto_network text NOT NULL DEFAULT 'TRC20',
  destination_wallet text,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_transactions_driver_idx ON public.payment_transactions (driver_id, created_at DESC);

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_own ON public.payment_transactions;
CREATE POLICY payments_select_own ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = payment_transactions.driver_id AND d.user_id = auth.uid()));

DROP TRIGGER IF EXISTS payment_transactions_set_updated_at ON public.payment_transactions;
CREATE TRIGGER payment_transactions_set_updated_at BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Sequential booking status workflow enforced in the database
CREATE OR REPLACE FUNCTION public.validate_booking_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE allowed text[];
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  allowed := CASE OLD.status::text
    WHEN 'pending' THEN ARRAY['driver_accepted', 'rejected', 'cancelled']
    WHEN 'driver_accepted' THEN ARRAY['driver_arriving', 'cancelled']
    WHEN 'driver_arriving' THEN ARRAY['driver_arrived', 'cancelled']
    WHEN 'driver_arrived' THEN ARRAY['trip_started', 'cancelled']
    WHEN 'trip_started' THEN ARRAY['completed']
    ELSE ARRAY[]::text[]
  END;
  IF NOT (NEW.status::text = ANY (allowed)) THEN
    RAISE EXCEPTION 'invalid_status_transition:% -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_validate_transition ON public.bookings;
CREATE TRIGGER bookings_validate_transition BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_transition();

-- 6. History + commission charge on status change
CREATE OR REPLACE FUNCTION public.record_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE rate numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, NEW.passenger_id);
    RETURN NULL;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());

    IF NEW.status::text = 'completed' AND NEW.driver_id IS NOT NULL THEN
      SELECT commission_rate INTO rate FROM public.drivers WHERE id = NEW.driver_id;
      IF NOT EXISTS (
        SELECT 1 FROM public.commission_transactions
        WHERE booking_id = NEW.id AND type = 'commission_charge'
      ) THEN
        INSERT INTO public.commission_transactions (driver_id, booking_id, amount_sar, type, status)
        VALUES (NEW.driver_id, NEW.id, round(NEW.price * COALESCE(rate, 0.10), 2), 'commission_charge', 'confirmed');
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bookings_status_history ON public.bookings;
CREATE TRIGGER bookings_status_history AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.record_booking_status_change();

-- 7. No duplicate offers for the same route/slot
CREATE UNIQUE INDEX IF NOT EXISTS driver_offers_unique_slot
  ON public.driver_offers (driver_id, pickup_city, destination_airport, date, "time", ride_type);

-- 8. Realtime foundation
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;