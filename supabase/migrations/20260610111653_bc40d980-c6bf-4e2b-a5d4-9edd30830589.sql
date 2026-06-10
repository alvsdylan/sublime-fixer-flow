
-- Notifications table for admin notifications about new repairs
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.repair_cards(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'repair_created',
  client_name text NOT NULL,
  order_number text NOT NULL,
  attendant_name text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger: when a new repair card is created, fan out a notification to every active admin
CREATE OR REPLACE FUNCTION public.notify_admins_new_repair()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, card_id, type, client_name, order_number, attendant_name)
  SELECT p.id, NEW.id, 'repair_created', NEW.client_name, NEW.order_number, NEW.attendant_name
  FROM public.profiles p
  WHERE p.role = 'admin' AND p.active = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER repair_cards_notify_admins
AFTER INSERT ON public.repair_cards
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_repair();

-- Enable realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
