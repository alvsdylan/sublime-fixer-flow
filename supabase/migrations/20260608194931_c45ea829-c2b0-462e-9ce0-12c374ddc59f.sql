
-- ============ Enums ============
CREATE TYPE public.user_role AS ENUM ('admin', 'common');

-- ============ Profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'common',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Security definer helpers ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role AND active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.current_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(username, email) FROM public.profiles WHERE id = auth.uid()
$$;

-- ============ Profiles RLS ============
CREATE POLICY "Authenticated can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin());

-- Auto-create profile when an auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_name text;
  v_role public.user_role;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', v_username);
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'common');

  INSERT INTO public.profiles (id, name, username, email, role, active)
  VALUES (NEW.id, v_name, v_username, NEW.email, v_role, true)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Audit log ============
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  module text NOT NULL,
  action text NOT NULL,
  target text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads audit" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Authenticated can insert audit" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- No update/delete policies → audit is immutable

CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX audit_log_user_id_idx ON public.audit_log (user_id);
CREATE INDEX audit_log_module_idx ON public.audit_log (module);

-- ============ Tighten RLS on existing tables (login required) ============

-- Repair cards
DROP POLICY IF EXISTS "Public access to repair cards" ON public.repair_cards;
REVOKE ALL ON public.repair_cards FROM anon;
CREATE POLICY "Auth read repair cards" ON public.repair_cards
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert repair cards" ON public.repair_cards
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update repair cards" ON public.repair_cards
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete repair cards" ON public.repair_cards
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read history" ON public.repair_card_history;
DROP POLICY IF EXISTS "Public insert history" ON public.repair_card_history;
REVOKE ALL ON public.repair_card_history FROM anon;
CREATE POLICY "Auth read repair history" ON public.repair_card_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert repair history" ON public.repair_card_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Production orders
DROP POLICY IF EXISTS "Public access to production orders" ON public.production_orders;
REVOKE ALL ON public.production_orders FROM anon;
CREATE POLICY "Auth read production orders" ON public.production_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert production orders" ON public.production_orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update production orders" ON public.production_orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete production orders" ON public.production_orders
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read production history" ON public.production_order_history;
DROP POLICY IF EXISTS "Public insert production history" ON public.production_order_history;
REVOKE ALL ON public.production_order_history FROM anon;
CREATE POLICY "Auth read production history" ON public.production_order_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert production history" ON public.production_order_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============ Audit triggers on cards / orders ============

CREATE OR REPLACE FUNCTION public.audit_repair_cards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user text := public.current_username();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
    VALUES (auth.uid(), v_user, 'Consertos', 'criou conserto',
            NEW.client_name || ' (#' || NEW.order_number || ')',
            jsonb_build_object('id', NEW.id, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Consertos',
              'moveu de ' || OLD.status::text || ' para ' || NEW.status::text,
              NEW.client_name || ' (#' || NEW.order_number || ')',
              jsonb_build_object('id', NEW.id, 'from', OLD.status, 'to', NEW.status));
    ELSE
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Consertos', 'editou conserto',
              NEW.client_name || ' (#' || NEW.order_number || ')',
              jsonb_build_object('id', NEW.id));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
    VALUES (auth.uid(), v_user, 'Consertos', 'excluiu conserto',
            OLD.client_name || ' (#' || OLD.order_number || ')',
            jsonb_build_object('id', OLD.id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_repair_cards_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.repair_cards
  FOR EACH ROW EXECUTE FUNCTION public.audit_repair_cards();

CREATE OR REPLACE FUNCTION public.audit_production_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user text := public.current_username();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
    VALUES (auth.uid(), v_user, 'Produção', 'criou pedido',
            NEW.client_name || ' (#' || NEW.order_number || ')',
            jsonb_build_object('id', NEW.id, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Produção',
              'moveu de ' || OLD.status::text || ' para ' || NEW.status::text,
              NEW.client_name || ' (#' || NEW.order_number || ')',
              jsonb_build_object('id', NEW.id, 'from', OLD.status, 'to', NEW.status));
    ELSE
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Produção', 'editou pedido',
              NEW.client_name || ' (#' || NEW.order_number || ')',
              jsonb_build_object('id', NEW.id));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
    VALUES (auth.uid(), v_user, 'Produção', 'excluiu pedido',
            OLD.client_name || ' (#' || OLD.order_number || ')',
            jsonb_build_object('id', OLD.id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_production_orders_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_production_orders();

-- ============ Seed admin user THADMIN ============
DO $$
DECLARE
  v_id uuid;
  v_email text := 'thadmin@app.local';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN;
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt('193752@@', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name','Administrador','username','THADMIN','role','admin'),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email),
    'email', now(), now(), now()
  );

  -- Ensure profile has admin role (trigger already inserts; update to be safe)
  UPDATE public.profiles
  SET role = 'admin', name = 'Administrador', username = 'THADMIN', active = true
  WHERE id = v_id;
END $$;
