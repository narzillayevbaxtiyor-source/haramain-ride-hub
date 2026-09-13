-- 1) Signed-in users need the same public read access anonymous visitors already had.
CREATE POLICY offers_public_read_auth ON public.driver_offers
  FOR SELECT TO authenticated USING (status = 'active'::offer_status);

CREATE POLICY drivers_public_read_auth ON public.drivers
  FOR SELECT TO authenticated USING (status = ANY (ARRAY['approved'::driver_status, 'active'::driver_status]));

CREATE POLICY profiles_public_driver_read_auth ON public.profiles
  FOR SELECT TO authenticated USING (role = 'driver'::app_role);

-- 2) Booking triggers must not depend on the caller's row-level access.
CREATE OR REPLACE FUNCTION public.validate_booking_creation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_booking_conflict()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.record_booking_status_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.recalc_commission_balance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE target uuid;
BEGIN
  target = COALESCE(NEW.driver_id, OLD.driver_id);
  UPDATE public.drivers
  SET commission_balance_sar = COALESCE((
    SELECT SUM(CASE WHEN t.type = 'commission_charge' THEN t.amount_sar ELSE -t.amount_sar END)
    FROM public.commission_transactions t
    WHERE t.driver_id = target AND t.status = 'confirmed'
  ), 0)
  WHERE id = target;
  RETURN NULL;
END;
$function$;