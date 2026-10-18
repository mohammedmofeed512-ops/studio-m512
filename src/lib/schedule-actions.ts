"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { planDays, type StripScene } from "@/lib/production/schedule";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 2000) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) || null : null;
const time = (v: unknown) => (typeof v === "string" && TIME.test(v) ? v : null);
const date = (v: unknown) => (typeof v === "string" && DATE.test(v) ? v : null);

const revalidate = (projectId: string) => {
  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}/call-sheets`, "layout");
};

// ───────────── shoot days ─────────────
async function nextDayNumber(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], projectId: string) {
  const { data } = await supabase.from("shoot_days").select("day_number").eq("project_id", projectId).order("day_number", { ascending: false }).limit(1).maybeSingle();
  return (data?.day_number ?? 0) + 1;
}

export async function addShootDay(projectId: string) {
  const { supabase } = await requireUser();
  if (!isId(projectId)) return { ok: false as const };
  const { data, error } = await supabase
    .from("shoot_days")
    .insert({ project_id: projectId, day_number: await nextDayNumber(supabase, projectId) })
    .select("id")
    .single();
  revalidate(projectId);
  return error || !data ? { ok: false as const } : { ok: true as const, id: data.id };
}

export async function updateShootDay(input: { projectId: string; dayId: string; shoot_date?: string; general_call?: string; wrap_time?: string; location_contact_id?: string }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.dayId)) return { ok: false as const };
  const patch: { shoot_date?: string | null; general_call?: string | null; wrap_time?: string | null; location_contact_id?: string | null } = {};
  if ("shoot_date" in input) patch.shoot_date = date(input.shoot_date);
  if ("general_call" in input) patch.general_call = time(input.general_call);
  if ("wrap_time" in input) patch.wrap_time = time(input.wrap_time);
  if ("location_contact_id" in input) patch.location_contact_id = isId(input.location_contact_id) ? input.location_contact_id : null;
  const { error } = await supabase.from("shoot_days").update(patch).eq("id", input.dayId).eq("project_id", input.projectId);
  revalidate(input.projectId);
  return { ok: !error };
}

/** Deletes a day and renumbers the rest; its scenes become unscheduled. */
export async function deleteShootDay(projectId: string, dayId: string) {
  const { supabase } = await requireUser();
  if (!isId(projectId) || !isId(dayId)) return;
  await supabase.from("shoot_days").delete().eq("id", dayId).eq("project_id", projectId);
  const { data: rest } = await supabase.from("shoot_days").select("id, day_number").eq("project_id", projectId).order("day_number");
  for (const [i, d] of (rest ?? []).entries()) {
    if (d.day_number !== i + 1) await supabase.from("shoot_days").update({ day_number: i + 1 }).eq("id", d.id);
  }
  revalidate(projectId);
}

/** Saves the order of scenes in every day, in one transaction. */
export async function saveStripboard(projectId: string, layout: string) {
  const { supabase } = await requireUser();
  if (!isId(projectId) || typeof layout !== "string" || layout.length > 500_000) return { ok: false as const, error: "invalid" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(layout);
  } catch {
    return { ok: false as const, error: "invalid" };
  }
  if (!Array.isArray(parsed)) return { ok: false as const, error: "invalid" };
  const days = parsed
    .filter((d): d is { id: string; sceneIds: unknown[] } => isId(d?.id) && Array.isArray(d?.sceneIds))
    .map((d) => ({ id: d.id, sceneIds: d.sceneIds.filter(isId) }));
  const { error } = await supabase.rpc("save_stripboard", { p_project: projectId, p_layout: days });
  if (error) {
    console.error("saveStripboard", error);
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/projects/${projectId}/call-sheets`, "layout");
  return { ok: true as const };
}

/** Creates new days for the script's unscheduled scenes, grouped by location. */
export async function autoSchedule(projectId: string, scriptId: string, pagesPerDay: number) {
  const { supabase } = await requireUser();
  if (!isId(projectId) || !isId(scriptId)) return { ok: false as const, days: 0 };
  const ppd = Number.isFinite(pagesPerDay) ? Math.min(30, Math.max(0.5, pagesPerDay)) : 5;
  const [{ data: scenes }, { data: days }] = await Promise.all([
    supabase.from("scenes").select("id, scene_number, int_ext, location_name, day_night, page_eighths, synopsis").eq("script_id", scriptId).order("position"),
    supabase.from("shoot_days").select("id").eq("project_id", projectId),
  ]);
  const dayIds = (days ?? []).map((d) => d.id);
  const { data: taken } = dayIds.length ? await supabase.from("shoot_day_scenes").select("scene_id").in("shoot_day_id", dayIds) : { data: [] };
  const used = new Set((taken ?? []).map((r) => r.scene_id));
  const plan = planDays(((scenes ?? []) as StripScene[]).filter((s) => !used.has(s.id)), ppd);
  let n = await nextDayNumber(supabase, projectId);
  for (const sceneIds of plan) {
    const { data: day, error } = await supabase.from("shoot_days").insert({ project_id: projectId, day_number: n++ }).select("id").single();
    if (error || !day) break;
    await supabase.from("shoot_day_scenes").insert(sceneIds.map((scene_id, i) => ({ shoot_day_id: day.id, scene_id, position: i + 1 })));
  }
  revalidate(projectId);
  return { ok: true as const, days: plan.length };
}

// ───────────── call sheets ─────────────
export async function saveCallSheet(formData: FormData) {
  const { supabase } = await requireUser();
  const projectId = formData.get("project_id");
  const dayId = formData.get("day_id");
  if (!isId(projectId) || !isId(dayId)) return;
  await Promise.all([
    supabase
      .from("shoot_days")
      .update({
        shoot_date: date(formData.get("shoot_date")),
        general_call: time(formData.get("general_call")),
        wrap_time: time(formData.get("wrap_time")),
        location_contact_id: isId(formData.get("location_contact_id")) ? (formData.get("location_contact_id") as string) : null,
      })
      .eq("id", dayId)
      .eq("project_id", projectId),
    supabase
      .from("call_sheets")
      .update({
        weather: text(formData.get("weather"), 200),
        nearest_hospital: text(formData.get("nearest_hospital"), 300),
        general_notes: text(formData.get("general_notes"), 4000),
      })
      .eq("shoot_day_id", dayId),
  ]);
  revalidate(projectId);
}

export async function addRecipients(input: { projectId: string; callSheetId: string; contactIds: string[]; callTime?: string | null }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.callSheetId)) return;
  const ids = [...new Set(input.contactIds.filter(isId))].slice(0, 300);
  if (!ids.length) return;
  await supabase
    .from("call_sheet_recipients")
    .upsert(ids.map((contact_id) => ({ call_sheet_id: input.callSheetId, contact_id, call_time: time(input.callTime) })), {
      onConflict: "call_sheet_id,contact_id",
      ignoreDuplicates: true,
    });
  revalidate(input.projectId);
}

export async function updateRecipient(input: { projectId: string; id: string; call_time?: string; sent?: boolean }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.id)) return;
  if ("call_time" in input) await supabase.from("call_sheet_recipients").update({ call_time: time(input.call_time) }).eq("id", input.id);
  if (input.sent) {
    const { data: r } = await supabase.from("call_sheet_recipients").update({ status: "sent" }).eq("id", input.id).eq("status", "pending").select("call_sheet_id").maybeSingle();
    if (r) await supabase.from("call_sheets").update({ sent_at: new Date().toISOString() }).eq("id", r.call_sheet_id).is("sent_at", null);
  }
  revalidate(input.projectId);
}

export async function removeRecipient(projectId: string, id: string) {
  const { supabase } = await requireUser();
  if (!isId(projectId) || !isId(id)) return;
  await supabase.from("call_sheet_recipients").delete().eq("id", id);
  revalidate(projectId);
}

/** Links a cast character (breakdown element) to the actor's contact. */
export async function setCastActor(projectId: string, elementId: string, contactId: string) {
  const { supabase } = await requireUser();
  if (!isId(projectId) || !isId(elementId)) return;
  await supabase.from("elements").update({ contact_id: isId(contactId) ? contactId : null }).eq("id", elementId).eq("project_id", projectId);
  revalidate(projectId);
  revalidatePath(`/projects/${projectId}/breakdown`);
}

// ───────────── public links (no account) ─────────────
const TOKEN = /^[0-9a-f]{48}$/;

export async function markCallSheetOpened(token: string) {
  if (!TOKEN.test(token)) return;
  const supabase = await createClient();
  await supabase.rpc("call_sheet_opened", { p_token: token });
}

export async function confirmCallSheet(token: string) {
  if (!TOKEN.test(token)) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase.rpc("call_sheet_confirm", { p_token: token });
  return { ok: Boolean(data) };
}
