ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS previous_status public.booking_status;

CREATE INDEX IF NOT EXISTS bookings_passenger_status_idx ON public.bookings (passenger_id, status);

-- Booking creation guards: offer must be live, driver must be able to drive,
-- and the same passenger may not stack identical open requests.
CREATE OR REPLACE FUNCTION public.validate_booking_creation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE d_status public.driver_status; o_status public.offer_status; dup int;
BEGIN
  IF NEW.driver_id IS NULL THEN
    RAISE EXCEPTION 'driver_required';
  END IF;

  SELECT status INTO d_status FROM public.drivers WHERE id = NEW.driver_id;
  IF d_status IS NULL OR d_status NOT IN ('active', 'approved') THEN
    RAISE EXCEPTION 'driver_unavailable';
  END IF;

  IF NEW.offer_id IS NOT NULL THEN
    SELECT status INTO o_status FROM public.driver_offers WHERE id = NEW.offer_id;
    IF o_status IS NULL OR o_status <> 'active' THEN
      RAISE EXCEPTION 'offer_unavailable';
    END IF;
  END IF;

  IF NEW.passenger_id IS NOT NULL THEN
    SELECT count(*) INTO dup FROM public.bookings b
    WHERE b.passenger_id = NEW.passenger_id
      AND b.driver_id = NEW.driver_id
      AND b.date = NEW.date
      AND b.time = NEW.time
      AND b.status IN ('pending', 'driver_accepted', 'driver_arriving', 'driver_arrived', 'trip_started');
    IF dup > 0 THEN
      RAISE EXCEPTION 'duplicate_booking';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_validate_creation ON public.bookings;
CREATE TRIGGER bookings_validate_creation
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_creation();

-- A driver cannot hold two overlapping accepted trips (90 minute window).
CREATE OR REPLACE FUNCTION public.prevent_booking_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE clash int;
BEGIN
  IF NEW.status <> 'driver_accepted' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO clash FROM public.bookings b
  WHERE b.driver_id = NEW.driver_id
    AND b.id <> NEW.id
    AND b.date = NEW.date
    AND b.status IN ('driver_accepted', 'driver_arriving', 'driver_arrived', 'trip_started')
    AND abs(extract(epoch FROM (b.time - NEW.time))) < 5400;

  IF clash > 0 THEN
    RAISE EXCEPTION 'booking_conflict';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_prevent_conflict ON public.bookings;
CREATE TRIGGER bookings_prevent_conflict
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_conflict();

-- Cancellation / rejection bookkeeping.
CREATE OR REPLACE FUNCTION public.record_booking_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.previous_status = OLD.status;
    NEW.cancelled_at = now();
    NEW.cancelled_by = COALESCE(NEW.cancelled_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_record_cancellation ON public.bookings;
CREATE TRIGGER bookings_record_cancellation
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.record_booking_cancellation();

-- History entries now carry the cancellation reason.
CREATE OR REPLACE FUNCTION public.record_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE rate numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status, NEW.passenger_id);
    RETURN NULL;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
    VALUES (
      NEW.id,
      NEW.status,
      COALESCE(auth.uid(), NEW.cancelled_by),
      CASE WHEN NEW.status IN ('cancelled', 'rejected') THEN NEW.cancellation_reason ELSE NULL END
    );

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