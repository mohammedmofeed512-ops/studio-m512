"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["user", "support", "admin"] as const;
const int = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1_000_000) : 0;
};
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
  });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
