import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  module: string,
  action: string,
  target?: string,
  details?: Record<string, unknown>,
) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    let userName: string | null = null;
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username,name")
        .eq("id", user.id)
        .maybeSingle();
      userName = prof?.username ?? prof?.name ?? user.email ?? null;
    }
    await supabase.from("audit_log").insert({
      user_id: user?.id ?? null,
      user_name: userName,
      module,
      action,
      target: target ?? null,
      details: details ?? null,
    });
  } catch (e) {
    console.warn("audit failed", e);
  }
}
