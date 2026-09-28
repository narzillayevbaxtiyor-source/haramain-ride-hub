-- Production commission rules
-- Platform commission: 20%
-- Driver is blocked at outstanding commission >= 100 SAR

CREATE OR REPLACE FUNCTION public.apply_commission_block()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_balance_sar >= 100
     AND NEW.status IN ('active', 'approved', 'pending') THEN
    NEW.status := 'blocked';

  ELSIF NEW.commission_balance_sar < 100
     AND NEW.status = 'blocked' THEN
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drivers_commission_block
ON public.drivers;

CREATE TRIGGER drivers_commission_block
BEFORE INSERT OR UPDATE OF commission_balance_sar, status
ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.apply_commission_block();
