"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["user", "support", "admin"] as const;
const int = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1_000_000) : 0;
};
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const optInt = (v: unknown) => (v === "" || v === null || v === undefined ? null : int(v));

export type AdminResult = { ok: true } | { ok: false; error: "selfDemote" | "failed" };

/** Changes an account's plan, role, extras or suspension (the database checks the caller is an admin). */
export async function updateAccount(input: {
  userId: string;
  plan: string;
  expires: string;
  role: string;
  suspended: boolean;
  extraProjects: number;
  extraMembers: number;
  extraStorageMb: number;
  notes: string;
}): Promise<AdminResult> {
  const { supabase } = await requireUser();
  if (!UUID.test(input.userId)) return { ok: false, error: "failed" };
  const role = (ROLES as readonly string[]).includes(input.role) ? input.role : "user";
  const expires = /^\d{4}-\d{2}-\d{2}$/.test(input.expires) ? `${input.expires}T23:59:59Z` : null;
  const { error } = await supabase.rpc("admin_update_account", {
    p_user: input.userId,
    p_plan: String(input.plan).slice(0, 32),
    p_expires: expires,
    p_role: role,
    p_suspended: Boolean(input.suspended),
    p_extra_projects: int(input.extraProjects),
    p_extra_members: int(input.extraMembers),
    p_extra_storage_mb: int(input.extraStorageMb),
    p_notes: typeof input.notes === "string" ? input.notes.slice(0, 2000) : "",
  });
  if (error) return { ok: false, error: error.message.includes("cannot_demote_self") ? "selfDemote" : "failed" };
  revalidatePath("/admin");
  return { ok: true };
}

export type DeleteResult = { ok: true } | { ok: false; error: "self" | "admin" | "confirm" | "failed" };

/**
 * Deletes an account and everything it owns, so the person can sign up again with the same email.
 * The admin types the account's email to confirm. Media files go after the account is gone.
 */
export async function deleteAccount(input: { userId: string; confirmEmail: string; email: string }): Promise<DeleteResult> {
  const { supabase, userId } = await requireUser();
  if (!UUID.test(input.userId)) return { ok: false, error: "failed" };
  if (input.userId === userId) return { ok: false, error: "self" };
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!email || String(input.confirmEmail ?? "").trim().toLowerCase() !== email) return { ok: false, error: "confirm" };

  const { data: files, error: listError } = await supabase.rpc("admin_account_media", { p_user: input.userId });
  if (listError) return { ok: false, error: "failed" };

  const { error } = await supabase.rpc("admin_delete_account", { p_user: input.userId });
  if (error) {
    if (error.message.includes("cannot_delete_self")) return { ok: false, error: "self" };
    if (error.message.includes("cannot_delete_admin")) return { ok: false, error: "admin" };
    return { ok: false, error: "failed" };
  }

  const names = ((files ?? []) as unknown[]).map(String);
  for (let i = 0; i < names.length; i += 100) await supabase.storage.from("media").remove(names.slice(i, i + 100));
  revalidatePath("/admin");
  return { ok: true };
}

/** Creates or updates a plan (row security only lets admins write plans). */
export async function savePlan(input: {
  id: string;
  name_ar: string;
  name_en: string;
  max_projects: string | number | null;
  max_members_per_project: string | number | null;
  storage_mb: string | number | null;
  call_sheets: boolean;
  claude: boolean;
  is_default: boolean;
  position: number;
  price_ar?: string;
  price_en?: string;
  description_ar?: string;
  description_en?: string;
  highlight?: boolean;
}): Promise<AdminResult> {
  const { supabase } = await requireUser();
  const id = String(input.id).toLowerCase().trim();
  if (!/^[a-z0-9_]{2,32}$/.test(id)) return { ok: false, error: "failed" };
  const name_ar = String(input.name_ar).trim().slice(0, 60);
  const name_en = String(input.name_en).trim().slice(0, 60);
  if (!name_ar || !name_en) return { ok: false, error: "failed" };
  if (input.is_default) {
    const { error } = await supabase.from("plans").update({ is_default: false }).neq("id", id).eq("is_default", true);
    if (error) return { ok: false, error: "failed" };
  }
  const { error } = await supabase.from("plans").upsert({
    id,
    name_ar,
    name_en,
    max_projects: optInt(input.max_projects),
    max_members_per_project: optInt(input.max_members_per_project),
    storage_mb: optInt(input.storage_mb),
    features: { call_sheets: Boolean(input.call_sheets), claude: Boolean(input.claude) },
    is_default: Boolean(input.is_default),
    position: int(input.position),
    price_ar: text(input.price_ar, 60),
    price_en: text(input.price_en, 60),
    description_ar: text(input.description_ar, 300),
    description_en: text(input.description_en, 300),
    highlight: Boolean(input.highlight),
  });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function handleUpgrade(requestId: string, approve: boolean, months: number): Promise<AdminResult> {
  const { supabase } = await requireUser();
  if (!UUID.test(requestId)) return { ok: false, error: "failed" };
  const { error } = await supabase.rpc("admin_handle_upgrade", { p_request: requestId, p_approve: Boolean(approve), p_months: int(months) });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** A user asks to move to another plan. */
export async function requestUpgrade(planId: string, message: string) {
  const { supabase } = await requireUser();
  if (!/^[a-z0-9_]{2,32}$/.test(planId)) return { ok: false };
  const { error } = await supabase.from("upgrade_requests").insert({ plan_id: planId, message: typeof message === "string" ? message.trim().slice(0, 1000) || null : null });
  revalidatePath("/settings");
  revalidatePath("/admin");
  return { ok: !error };
}

export async function withdrawUpgrade(requestId: string) {
  const { supabase } = await requireUser();
  if (!UUID.test(requestId)) return;
  await supabase.from("upgrade_requests").delete().eq("id", requestId).eq("status", "pending");
  revalidatePath("/settings");
  revalidatePath("/admin");
}
