import { supabase } from "@/integrations/supabase/client";

interface CreateInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "common";
}

interface UpdateInput {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: "admin" | "common";
  active?: boolean;
}

export async function createUser({ data }: { data: CreateInput }) {
  const { error } = await supabase.functions.invoke("admin-users", {
    body: { action: "create", ...data },
  });
  if (error) throw new Error(error.message);
}

export async function updateUser({ data }: { data: UpdateInput }) {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.username !== undefined) patch.username = data.username;
  if (data.email !== undefined) patch.email = data.email;
  if (data.role !== undefined) patch.role = data.role;
  if (data.active !== undefined) patch.active = data.active;

  const { error } = await supabase
    .from("profiles")
    .update(patch as any)
    .eq("id", data.id);
  if (error) throw new Error(error.message);
}

export async function resetUserPassword({ data }: { data: { id: string; password: string } }) {
  const { error } = await supabase.functions.invoke("admin-users", {
    body: { action: "reset-password", id: data.id, password: data.password },
  });
  if (error) throw new Error(error.message);
}

export async function deleteUser({ data }: { data: { id: string } }) {
  const { error } = await supabase.functions.invoke("admin-users", {
    body: { action: "delete", id: data.id },
  });
  if (error) throw new Error(error.message);
}
