REVOKE ALL ON FUNCTION public.validate_booking_creation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_booking_conflict() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_booking_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_commission_balance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_commission_block() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_booking_cancellation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_booking_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;