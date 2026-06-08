
CREATE TYPE public.production_status AS ENUM ('molde', 'impresso', 'calandra');

CREATE TABLE public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  order_number text NOT NULL,
  art_link text,
  status public.production_status NOT NULL DEFAULT 'molde',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_orders TO anon, authenticated;
GRANT ALL ON public.production_orders TO service_role;

ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access to production orders" ON public.production_orders
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.production_order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  from_status public.production_status,
  to_status public.production_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.production_order_history TO anon, authenticated;
GRANT ALL ON public.production_order_history TO service_role;

ALTER TABLE public.production_order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read production history" ON public.production_order_history
  FOR SELECT USING (true);
CREATE POLICY "Public insert production history" ON public.production_order_history
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_production_orders_updated_at
  BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_production_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.production_order_history(order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER production_status_change_log
  AFTER UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_production_status_change();

CREATE OR REPLACE FUNCTION public.log_production_creation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.production_order_history(order_id, from_status, to_status)
  VALUES (NEW.id, NULL, NEW.status);
  RETURN NEW;
END;
$$;

CREATE TRIGGER production_creation_log
  AFTER INSERT ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_production_creation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.production_orders;
