"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { ELEMENT_CATEGORIES, type ElementCategory } from "@/lib/database.types";
import { docToLines } from "@/lib/screenplay/model";
import { nextShotNumber, sceneLines, speakingCharacters } from "@/lib/production/breakdown";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const clean = (v: unknown, max = 300) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

// ───────────── breakdown ─────────────
async function upsertElement(supabase: Supabase, projectId: string, category: ElementCategory, name: string) {
  const { data: existing } = await supabase.from("elements").select("id").eq("project_id", projectId).eq("category", category).ilike("name", name.replace(/[%_\\]/g, "\\$&")).maybeSingle();
  if (existing) return existing.id;
  let cast_number: number | null = null;
  if (category === "cast") {
    const { data: top } = await supabase.from("elements").select("cast_number").eq("project_id", projectId).eq("category", "cast").order("cast_number", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    cast_number = (top?.cast_number ?? 0) + 1;
  }
  const { data, error } = await supabase.from("elements").insert({ project_id: projectId, category, name, cast_number }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "element insert failed");
  return data.id;
}

export async function tagElement(input: { projectId: string; sceneId: string; category: string; name: string }) {
  const { supabase } = await requireUser();
  const name = clean(input.name, 160);
  const category = (ELEMENT_CATEGORIES as string[]).includes(input.category) ? (input.category as ElementCategory) : null;
  if (!isId(input.projectId) || !isId(input.sceneId) || !category || !name) return { ok: false as const };
  try {
    const elementId = await upsertElement(supabase, input.projectId, category, name);
    await supabase.from("scene_elements").upsert({ scene_id: input.sceneId, element_id: elementId }, { onConflict: "scene_id,element_id", ignoreDuplicates: true });
    revalidatePath(`/projects/${input.projectId}/breakdown`);
    return { ok: true as const };
  } catch (e) {
    console.error("tagElement", e);
    return { ok: false as const };
  }
}

export async function untagElement(input: { projectId: string; sceneId: string; elementId: string }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.sceneId) || !isId(input.elementId)) return;
  await supabase.from("scene_elements").delete().eq("scene_id", input.sceneId).eq("element_id", input.elementId);
  // An element used in no scene any more is removed from the project.
  const { count } = await supabase.from("scene_elements").select("scene_id", { count: "exact", head: true }).eq("element_id", input.elementId);
  if (!count) await supabase.from("elements").delete().eq("id", input.elementId);
  revalidatePath(`/projects/${input.projectId}/breakdown`);
}

/** Tags every speaking character in a script as cast in the scenes where they speak. */
export async function autoTagCast(input: { projectId: string; scriptId: string }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.scriptId)) return { tagged: 0 };
  const { data: script } = await supabase.from("scripts").select("current_version_id").eq("id", input.scriptId).eq("project_id", input.projectId).maybeSingle();
  const { data: version } = await supabase.from("script_versions").select("content").eq("id", script?.current_version_id ?? "").maybeSingle();
  const { data: scenes } = await supabase.from("scenes").select("id").eq("script_id", input.scriptId);
  if (!version || !scenes) return { tagged: 0 };

  const lines = docToLines(version.content);
  const ids = new Map<string, string>();
  const links: Array<{ scene_id: string; element_id: string }> = [];
  for (const scene of scenes) {
    for (const name of speakingCharacters(sceneLines(lines, scene.id))) {
      const key = name.toLowerCase();
      if (!ids.has(key)) ids.set(key, await upsertElement(supabase, input.projectId, "cast", name));
      links.push({ scene_id: scene.id, element_id: ids.get(key)! });
    }
  }
  if (links.length) await supabase.from("scene_elements").upsert(links, { onConflict: "scene_id,element_id", ignoreDuplicates: true });
  revalidatePath(`/projects/${input.projectId}/breakdown`);
  return { tagged: links.length };
}

// ───────────── shots ─────────────
type ShotFields = { size?: string | null; angle?: string | null; movement?: string | null; lens?: string | null; description?: string | null; duration_seconds?: number | null; shot_number?: string };

function shotFields(input: Record<string, unknown>): ShotFields {
  const out: ShotFields = {};
  for (const key of ["size", "angle", "movement", "lens"] as const) if (key in input) out[key] = clean(input[key], 60) || null;
  if ("description" in input) out.description = typeof input.description === "string" ? input.description.slice(0, 2000) : null;
  if ("shot_number" in input) out.shot_number = clean(input.shot_number, 12) || undefined;
  if ("duration_seconds" in input) {
    const n = Number(input.duration_seconds);
    out.duration_seconds = input.duration_seconds === null || input.duration_seconds === "" || !Number.isFinite(n) ? null : Math.max(0, Math.min(Math.round(n), 36000));
  }
  return out;
}

export async function addShot(input: { projectId: string; sceneId: string }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.sceneId)) return null;
  const [{ data: scene }, { data: existing }] = await Promise.all([
    supabase.from("scenes").select("scene_number").eq("id", input.sceneId).maybeSingle(),
    supabase.from("shots").select("shot_number, position").eq("scene_id", input.sceneId).order("position", { ascending: false }),
  ]);
  if (!scene) return null;
  const { data } = await supabase
    .from("shots")
    .insert({
      scene_id: input.sceneId,
      shot_number: nextShotNumber(scene.scene_number, (existing ?? []).map((s) => s.shot_number)),
      position: (existing?.[0]?.position ?? 0) + 1,
      size: "ms",
      angle: "eye",
      movement: "static",
    })
    .select("*")
    .single();
  revalidatePath(`/projects/${input.projectId}/shots`);
  return data;
}

export async function updateShot(input: { projectId: string; shotId: string; fields: Record<string, unknown> }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.shotId)) return { ok: false };
  const fields = shotFields(input.fields ?? {});
  const { error } = await supabase.from("shots").update(fields).eq("id", input.shotId);
  return { ok: !error };
}

export async function deleteShot(input: { projectId: string; shotId: string }) {
  const { supabase, userId } = await requireUser();
  if (!isId(input.projectId) || !isId(input.shotId)) return;
  const { data } = await supabase.from("shots").delete().eq("id", input.shotId).select("image_path").maybeSingle();
  if (data?.image_path?.startsWith(`${userId}/`)) await supabase.storage.from("media").remove([data.image_path]);
  revalidatePath(`/projects/${input.projectId}/shots`);
}

export async function moveShot(input: { projectId: string; sceneId: string; shotId: string; direction: -1 | 1 }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.sceneId) || !isId(input.shotId)) return;
  const { data: shots } = await supabase.from("shots").select("id, position").eq("scene_id", input.sceneId).order("position");
  if (!shots) return;
  const i = shots.findIndex((s) => s.id === input.shotId);
  const j = i + input.direction;
  if (i < 0 || j < 0 || j >= shots.length) return;
  [shots[i], shots[j]] = [shots[j], shots[i]];
  await Promise.all(shots.map((s, idx) => supabase.from("shots").update({ position: idx + 1 }).eq("id", s.id)));
  revalidatePath(`/projects/${input.projectId}/shots`);
}

/** Points a shot at an uploaded image (the file must sit in the user's own folder). */
export async function setShotImage(input: { projectId: string; shotId: string; path: string | null }) {
  const { supabase, userId } = await requireUser();
  if (!isId(input.projectId) || !isId(input.shotId)) return;
  if (input.path !== null && !input.path.startsWith(`${userId}/`)) return;
  const { data: old } = await supabase.from("shots").select("image_path").eq("id", input.shotId).maybeSingle();
  await supabase.from("shots").update({ image_path: input.path }).eq("id", input.shotId);
  if (old?.image_path && old.image_path !== input.path && old.image_path.startsWith(`${userId}/`)) await supabase.storage.from("media").remove([old.image_path]);
  revalidatePath(`/projects/${input.projectId}/shots`);
}

// ───────────── lookbook ─────────────
export async function addLookbookItems(input: { projectId: string; paths: string[]; category: string }) {
  const { supabase, userId } = await requireUser();
  if (!isId(input.projectId)) return;
  const paths = input.paths.filter((p) => typeof p === "string" && p.startsWith(`${userId}/`)).slice(0, 50);
  if (!paths.length) return;
  const category = clean(input.category, 80) || null;
  const base = Date.now();
  await supabase.from("lookbook_items").insert(paths.map((image_path, i) => ({ project_id: input.projectId, image_path, category, position: base + i })));
  revalidatePath(`/projects/${input.projectId}/lookbook`);
}

export async function updateLookbookItem(input: { projectId: string; itemId: string; note?: string; category?: string }) {
  const { supabase } = await requireUser();
  if (!isId(input.projectId) || !isId(input.itemId)) return;
  const change: { note?: string | null; category?: string | null } = {};
  if (input.note !== undefined) change.note = typeof input.note === "string" ? input.note.slice(0, 1000) || null : null;
  if (input.category !== undefined) change.category = clean(input.category, 80) || null;
  await supabase.from("lookbook_items").update(change).eq("id", input.itemId);
  revalidatePath(`/projects/${input.projectId}/lookbook`);
}

export async function deleteLookbookItem(input: { projectId: string; itemId: string }) {
  const { supabase, userId } = await requireUser();
  if (!isId(input.projectId) || !isId(input.itemId)) return;
  const { data } = await supabase.from("lookbook_items").delete().eq("id", input.itemId).select("image_path").maybeSingle();
  if (data?.image_path?.startsWith(`${userId}/`)) await supabase.storage.from("media").remove([data.image_path]);
  revalidatePath(`/projects/${input.projectId}/lookbook`);
}
