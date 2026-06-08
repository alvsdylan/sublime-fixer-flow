import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface CreateInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "common";
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.role !== "admin" || !data.active) {
    throw new Error("Apenas administradores podem executar esta ação");
  }
}

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInput) => {
    if (!d.name || !d.username || !d.email || !d.password) {
      throw new Error("Preencha todos os campos");
    }
    if (d.password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres");
    if (!["admin", "common"].includes(d.role)) throw new Error("Tipo inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, username: data.username, role: data.role },
    });
    if (error) throw new Error(error.message);

    // ensure profile reflects desired role/name (trigger may have used metadata; this is a safety net)
    if (created.user) {
      await supabaseAdmin.from("profiles").update({
        name: data.name,
        username: data.username,
        email: data.email,
        role: data.role,
        active: true,
      }).eq("id", created.user.id);

      await supabaseAdmin.from("audit_log").insert({
        user_id: context.userId,
        user_name: null,
        module: "Usuários",
        action: "criou usuário",
        target: data.username,
        details: { role: data.role },
      });
    }
    return { id: created.user?.id };
  });

interface UpdateInput {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: "admin" | "common";
  active?: boolean;
}

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpdateInput) => {
    if (!d.id) throw new Error("ID obrigatório");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const profilePatch: Record<string, unknown> = {};
    if (data.name !== undefined) profilePatch.name = data.name;
    if (data.username !== undefined) profilePatch.username = data.username;
    if (data.email !== undefined) profilePatch.email = data.email;
    if (data.role !== undefined) profilePatch.role = data.role;
    if (data.active !== undefined) profilePatch.active = data.active;

    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(profilePatch).eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    if (data.email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        email: data.email,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      user_name: null,
      module: "Usuários",
      action: "editou usuário",
      target: data.username ?? data.id,
      details: data as any,
    });
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; password: string }) => {
    if (!d.id || !d.password) throw new Error("Dados inválidos");
    if (d.password.length < 6) throw new Error("Senha mínima de 6 caracteres");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      user_name: null,
      module: "Usuários",
      action: "alterou senha de usuário",
      target: data.id,
    });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d.id) throw new Error("ID obrigatório");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) {
      throw new Error("Você não pode excluir o próprio usuário");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      user_name: null,
      module: "Usuários",
      action: "excluiu usuário",
      target: prof?.username ?? data.id,
    });
    return { ok: true };
  });
