
REVOKE EXECUTE ON FUNCTION public.current_username() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_production_creator() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_repair() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_production_orders() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_repair_cards() FROM anon, authenticated, public;
