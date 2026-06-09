
-- Add new columns for production orders
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS fabric text,
  ADD COLUMN IF NOT EXISTS color_profile text,
  ADD COLUMN IF NOT EXISTS created_by_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_name text;

-- Trigger to auto-fill creator on insert
CREATE OR REPLACE FUNCTION public.set_production_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_id IS NULL THEN
    NEW.created_by_id := auth.uid();
  END IF;
  IF NEW.created_by_name IS NULL THEN
    NEW.created_by_name := public.current_username();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_production_creator_trg ON public.production_orders;
CREATE TRIGGER set_production_creator_trg
BEFORE INSERT ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.set_production_creator();

-- Enhanced audit function: log fabric, color_profile, and status changes individually
CREATE OR REPLACE FUNCTION public.audit_production_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user text := public.current_username();
  v_target text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_target := NEW.client_name || ' (#' || NEW.order_number || ')';
    INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
    VALUES (auth.uid(), v_user, 'Produção', 'criou pedido', v_target,
            jsonb_build_object('id', NEW.id, 'status', NEW.status,
                               'fabric', NEW.fabric, 'color_profile', NEW.color_profile));
  ELSIF TG_OP = 'UPDATE' THEN
    v_target := NEW.client_name || ' (#' || NEW.order_number || ')';
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Produção',
              'moveu de ' || OLD.status::text || ' para ' || NEW.status::text,
              v_target, jsonb_build_object('id', NEW.id, 'from', OLD.status, 'to', NEW.status));
    END IF;
    IF NEW.fabric IS DISTINCT FROM OLD.fabric THEN
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Produção',
              'alterou tecido de ' || COALESCE(OLD.fabric, '—') || ' para ' || COALESCE(NEW.fabric, '—'),
              v_target, jsonb_build_object('id', NEW.id, 'from', OLD.fabric, 'to', NEW.fabric));
    END IF;
    IF NEW.color_profile IS DISTINCT FROM OLD.color_profile THEN
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Produção',
              'alterou perfil de cores de ' || COALESCE(OLD.color_profile, '—') || ' para ' || COALESCE(NEW.color_profile, '—'),
              v_target, jsonb_build_object('id', NEW.id, 'from', OLD.color_profile, 'to', NEW.color_profile));
    END IF;
    IF NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.fabric IS NOT DISTINCT FROM OLD.fabric
       AND NEW.color_profile IS NOT DISTINCT FROM OLD.color_profile
       AND (NEW.client_name IS DISTINCT FROM OLD.client_name
            OR NEW.order_number IS DISTINCT FROM OLD.order_number
            OR NEW.art_link IS DISTINCT FROM OLD.art_link) THEN
      INSERT INTO public.audit_log(user_id, user_name, module, action, target, details)
      VALUES (auth.uid(), v_user, 'Produção', 'editou pedido', v_target,
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
