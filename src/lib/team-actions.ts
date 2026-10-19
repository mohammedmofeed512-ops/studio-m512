"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { isRole, normalizeLevels, roleFor } from "@/lib/permissions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteResult = { ok: true; token: string } | { ok: false; error: "email" | "failed" };

/** Creates an invitation (the database only allows it for people who may manage the team). */
export async function inviteMember(input: { projectId: string; email: string; role: string; permissions: unknown }): Promise<InviteResult> {
  const { supabase, userId } = await requireUser();
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 320) : "";
  if (!isId(input.projectId)) return { ok: false, error: "failed" };
  if (!EMAIL.test(email)) return { ok: false, error: "email" };
  const levels = normalizeLevels(input.permissions);
  const role = isRole(input.role) ? input.role : roleFor(levels);
  const { data, error } = await supabase
    .from("project_invitations")
    .insert({ project_id: input.projectId, email, role, permissions: levels })
    .select("token")
    .single();
  if (error || !data) {
    console.error("inviteMember", error);
    return { ok: false, error: "failed" };
  }
  await logActivity(supabase, { projectId: input.projectId, userId, action: "member_invited", summary: email });
  revalidatePath(`/projects/${input.projectId}/team`);
  return { ok: true, token: data.token };
}

export async function revokeInvitation(projectId: string, invitationId: string) {
  const { supabase } = await requireUser();
  if (!isId(projectId) || !isId(invitationId)) return;
  await supabase.from("project_invitations").delete().eq("id", invitationId).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}/team`);
}

export async function updateMember(input: { projectId: string; userId: string; permissions: unknown }) {
  const { supabase, userId } = await requireUser();
  if (!isId(input.projectId) || !isId(input.userId)) return { ok: false };
  const levels = normalizeLevels(input.permissions);
  const role = roleFor(levels);
  const { data, error } = await supabase
    .from("project_members")
    .update({ role, permissions: levels })
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .select("user_id");
  if (error || !data?.length) return { ok: false };
  await logActivity(supabase, { projectId: input.projectId, userId, action: "member_updated", targetId: input.userId });
  revalidatePath(`/projects/${input.projectId}`, "layout");
  return { ok: true };
}

export async function removeMember(projectId: string, memberId: string) {
  const { supabase, userId } = await requireUser();
  if (!isId(projectId) || !isId(memberId)) return;
  if (memberId !== userId) await logActivity(supabase, { projectId, userId, action: "member_removed", targetId: memberId });
  await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", memberId);
  if (memberId === userId) {
    revalidatePath("/", "layout");
    redirect("/projects");
  }
  revalidatePath(`/projects/${projectId}/team`);
}

export type AcceptResult = { ok: true; projectId: string } | { ok: false; error: string };

export async function acceptInvitation(token: string): Promise<AcceptResult> {
  const { supabase } = await requireUser();
  if (typeof token !== "string" || !/^[0-9a-f]{48}$/.test(token)) return { ok: false, error: "invalid" };
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  const res = data as { ok?: boolean; project_id?: string; error?: string } | null;
  if (error || !res?.ok || !res.project_id) return { ok: false, error: res?.error ?? "invalid" };
  revalidatePath("/", "layout");
  return { ok: true, projectId: res.project_id };
}
