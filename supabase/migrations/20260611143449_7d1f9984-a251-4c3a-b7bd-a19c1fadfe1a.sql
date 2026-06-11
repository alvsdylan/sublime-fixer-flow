
-- 1) audit_log INSERT must match auth.uid()
DROP POLICY IF EXISTS "Authenticated can insert audit" ON public.audit_log;
CREATE POLICY "Authenticated insert own audit"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2) notifications: deny direct inserts by users (trigger uses SECURITY DEFINER)
CREATE POLICY "No direct notification inserts"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (false);

-- 3) Harden is_admin: revoke EXECUTE from anon/authenticated (used only by RLS in postgres role)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated, public;

-- 4) Storage: scope repair-images policies to authenticated
DROP POLICY IF EXISTS "Public delete repair images" ON storage.objects;
DROP POLICY IF EXISTS "Public read repair images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload repair images" ON storage.objects;

CREATE POLICY "Auth read repair images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'repair-images');

CREATE POLICY "Auth upload repair images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'repair-images');

CREATE POLICY "Auth delete repair images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'repair-images');

-- 5) Replace USING/WITH CHECK true with auth.uid() IS NOT NULL on mutation policies
-- repair_cards
DROP POLICY IF EXISTS "Auth delete repair cards" ON public.repair_cards;
CREATE POLICY "Auth delete repair cards" ON public.repair_cards
FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth insert repair cards" ON public.repair_cards;
CREATE POLICY "Auth insert repair cards" ON public.repair_cards
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth update repair cards" ON public.repair_cards;
CREATE POLICY "Auth update repair cards" ON public.repair_cards
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- repair_card_history
DROP POLICY IF EXISTS "Auth insert repair history" ON public.repair_card_history;
CREATE POLICY "Auth insert repair history" ON public.repair_card_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- production_orders
DROP POLICY IF EXISTS "Auth delete production orders" ON public.production_orders;
CREATE POLICY "Auth delete production orders" ON public.production_orders
FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth insert production orders" ON public.production_orders;
CREATE POLICY "Auth insert production orders" ON public.production_orders
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth update production orders" ON public.production_orders;
CREATE POLICY "Auth update production orders" ON public.production_orders
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- production_order_history
DROP POLICY IF EXISTS "Auth insert production history" ON public.production_order_history;
CREATE POLICY "Auth insert production history" ON public.production_order_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
