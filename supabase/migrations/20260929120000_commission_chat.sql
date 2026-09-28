-- Commission payment chat between a driver and the admin team, including
-- admin-issued manual payment requests ("payment widgets").
DO $$ BEGIN
  CREATE TYPE public.chat_sender_role AS ENUM ('driver', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_message_type AS ENUM ('text', 'payment_widget');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_payment_status AS ENUM ('none', 'awaiting_payment', 'marked_paid', 'confirmed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.commission_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  sender_role public.chat_sender_role NOT NULL,
  sender_id uuid NOT NULL,
  message_type public.chat_message_type NOT NULL DEFAULT 'text',
  body text,
  amount_sar numeric,
  amount_usd numeric,
  crypto_asset text,
  crypto_network text,
  wallet_address text,
  payment_status public.chat_payment_status NOT NULL DEFAULT 'none',
  commission_transaction_id uuid REFERENCES public.commission_transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commission_chat_messages_driver_idx
  ON public.commission_chat_messages (driver_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.commission_chat_messages TO authenticated;
GRANT ALL ON public.commission_chat_messages TO service_role;
ALTER TABLE public.commission_chat_messages ENABLE ROW LEVEL SECURITY;

-- A driver may read and write only their own thread, and may only insert
-- plain text (payment widgets are admin-only).
DROP POLICY IF EXISTS commission_chat_driver_read ON public.commission_chat_messages;
CREATE POLICY commission_chat_driver_read ON public.commission_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = commission_chat_messages.driver_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS commission_chat_driver_insert ON public.commission_chat_messages;
CREATE POLICY commission_chat_driver_insert ON public.commission_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'driver'
    AND sender_id = auth.uid()
    AND message_type = 'text'
    AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = commission_chat_messages.driver_id AND d.user_id = auth.uid())
  );

-- A driver may only flip their own awaiting payment widget to "marked_paid".
DROP POLICY IF EXISTS commission_chat_driver_mark_paid ON public.commission_chat_messages;
CREATE POLICY commission_chat_driver_mark_paid ON public.commission_chat_messages
  FOR UPDATE TO authenticated
  USING (
    message_type = 'payment_widget'
    AND payment_status = 'awaiting_payment'
    AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = commission_chat_messages.driver_id AND d.user_id = auth.uid())
  )
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = commission_chat_messages.driver_id AND d.user_id = auth.uid()));

-- Admin can read and write every thread.
DROP POLICY IF EXISTS commission_chat_admin_read ON public.commission_chat_messages;
CREATE POLICY commission_chat_admin_read ON public.commission_chat_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS commission_chat_admin_insert ON public.commission_chat_messages;
CREATE POLICY commission_chat_admin_insert ON public.commission_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND sender_role = 'admin' AND sender_id = auth.uid());

DROP POLICY IF EXISTS commission_chat_admin_update ON public.commission_chat_messages;
CREATE POLICY commission_chat_admin_update ON public.commission_chat_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Realtime, so both sides see new messages without refreshing.
ALTER TABLE public.commission_chat_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
