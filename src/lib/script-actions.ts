"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { docToLines, extractScenes, linesToDoc, REVISION_COLORS, type ElementKind, ELEMENT_KINDS, type ScriptLine } from "@/lib/screenplay/model";
import { emptyAvDoc, sanitizeAvDoc } from "@/lib/screenplay/av";

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (fd: FormData, key: string, max = 300) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
};

/** Accepts only well-formed lines; gives every scene heading a stable id. */
function sanitizeLines(input: unknown): ScriptLine[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 20000).map((l) => {
    const kind: ElementKind = (ELEMENT_KINDS as readonly string[]).includes(l?.kind) ? l.kind : "action";
    const text = typeof l?.text === "string" ? l.text.slice(0, 5000) : "";
    const sceneId = kind === "sceneHeading" ? (typeof l?.sceneId === "string" && UUID.test(l.sceneId) ? l.sceneId : crypto.randomUUID()) : null;
    return { kind, text, sceneId };
  });
}

/** Mirrors the scene headings in a screenplay into the scenes table (ids are stable across edits). */
async function syncScenes(supabase: Supabase, scriptId: string, lines: ScriptLine[]) {
  const scenes = extractScenes(lines);
  const ids = scenes.map((s) => s.id);
  const del = supabase.from("scenes").delete().eq("script_id", scriptId);
  await (ids.length ? del.not("id", "in", `(${ids.join(",")})`) : del);
  if (scenes.length) {
    await supabase.from("scenes").upsert(
      scenes.map((s) => ({
        id: s.id,
        script_id: scriptId,
        scene_number: s.number,
        int_ext: s.intExt,
        location_name: s.location || null,
        day_night: s.dayNight,
        synopsis: s.synopsis || null,
        page_eighths: s.pageEighths,
        position: s.position,
      })),
    );
  }
}

// ───────────── create ─────────────
export async function createScript(fd: FormData) {
  const { supabase } = await requireUser();
  const projectId = str(fd, "project_id", 64);
  if (!projectId || !UUID.test(projectId)) return;
  const kind = str(fd, "kind") === "av" ? "av" : "screenplay";
  const language = str(fd, "language") === "en" ? "en" : "ar";
  const title = str(fd, "title", 200) ?? (language === "ar" ? "سيناريو بدون عنوان" : "Untitled script");

  let content: Json;
  let lines: ScriptLine[] = [];
  if (kind === "av") {
    content = emptyAvDoc() as unknown as Json;
  } else {
    const imported = str(fd, "lines", 4_000_000);
    lines = imported ? sanitizeLines(JSON.parse(imported)) : [];
    if (!lines.length) lines = [{ kind: "sceneHeading", text: "", sceneId: crypto.randomUUID() }];
    content = linesToDoc(lines) as unknown as Json;
  }

  const { data: script, error } = await supabase.from("scripts").insert({ project_id: projectId, title, kind, language }).select("id").single();
  if (error || !script) return;
  const { data: version } = await supabase
    .from("script_versions")
    .insert({ script_id: script.id, version_number: 1, revision_color: "white", content })
    .select("id")
    .single();
  if (version) await supabase.from("scripts").update({ current_version_id: version.id }).eq("id", script.id);
  if (kind === "screenplay") await syncScenes(supabase, script.id, lines);

  revalidatePath(`/projects/${projectId}`, "layout");
  redirect(`/projects/${projectId}/scripts/${script.id}`);
}

// ───────────── autosave ─────────────
export type SaveResult = { ok: true; savedAt: string } | { ok: false };

export async function saveScriptContent(scriptId: string, content: unknown): Promise<SaveResult> {
  if (!UUID.test(scriptId)) return { ok: false };
  const { supabase } = await requireUser();
  const { data: script } = await supabase.from("scripts").select("id, kind, current_version_id").eq("id", scriptId).maybeSingle();
  if (!script?.current_version_id) return { ok: false };

  let clean: Json;
  if (script.kind === "av") {
    clean = sanitizeAvDoc(content) as unknown as Json;
  } else {
    const lines = sanitizeLines(docToLines(content));
    clean = linesToDoc(lines) as unknown as Json;
    await syncScenes(supabase, script.id, lines);
  }
  const { error } = await supabase.from("script_versions").update({ content: clean }).eq("id", script.current_version_id);
  if (error) return { ok: false };
  await supabase.from("scripts").update({ updated_at: new Date().toISOString() }).eq("id", script.id);
  return { ok: true, savedAt: new Date().toISOString() };
}

// ───────────── versions ─────────────
export async function createRevision(fd: FormData) {
  const { supabase } = await requireUser();
  const scriptId = str(fd, "script_id", 64);
  const color = str(fd, "color") ?? "blue";
  if (!scriptId || !UUID.test(scriptId) || !(REVISION_COLORS as readonly string[]).includes(color)) return;

  const { data: script } = await supabase.from("scripts").select("id, project_id, current_version_id").eq("id", scriptId).maybeSingle();
  if (!script) return;
  const [{ data: current }, { data: latest }] = await Promise.all([
    supabase.from("script_versions").select("content").eq("id", script.current_version_id ?? "").maybeSingle(),
    supabase.from("script_versions").select("version_number").eq("script_id", scriptId).order("version_number", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { data: version } = await supabase
    .from("script_versions")
    .insert({ script_id: scriptId, version_number: (latest?.version_number ?? 0) + 1, revision_color: color, content: current?.content ?? {} })
    .select("id")
    .single();
  if (version) await supabase.from("scripts").update({ current_version_id: version.id }).eq("id", scriptId);
  revalidatePath(`/projects/${script.project_id}/scripts/${scriptId}`);
}

export async function switchVersion(fd: FormData) {
  const { supabase } = await requireUser();
  const scriptId = str(fd, "script_id", 64);
  const versionId = str(fd, "version_id", 64);
  if (!scriptId || !versionId || !UUID.test(scriptId) || !UUID.test(versionId)) return;
  const { data: version } = await supabase.from("script_versions").select("id, content").eq("id", versionId).eq("script_id", scriptId).maybeSingle();
  if (!version) return;
  const { data: script } = await supabase.from("scripts").update({ current_version_id: version.id }).eq("id", scriptId).select("project_id, kind").single();
  if (script?.kind === "screenplay") await syncScenes(supabase, scriptId, sanitizeLines(docToLines(version.content)));
  if (script) revalidatePath(`/projects/${script.project_id}/scripts/${scriptId}`);
}

// ───────────── manage ─────────────
export async function renameScript(fd: FormData) {
  const { supabase } = await requireUser();
  const scriptId = str(fd, "script_id", 64);
  const title = str(fd, "title", 200);
  if (!scriptId || !title || !UUID.test(scriptId)) return;
  const { data } = await supabase.from("scripts").update({ title }).eq("id", scriptId).select("project_id").single();
  if (data) revalidatePath(`/projects/${data.project_id}`, "layout");
}

export async function deleteScript(fd: FormData) {
  const { supabase } = await requireUser();
  const scriptId = str(fd, "script_id", 64);
  if (!scriptId || !UUID.test(scriptId)) return;
  const { data } = await supabase.from("scripts").select("project_id").eq("id", scriptId).maybeSingle();
  if (!data) return;
  // current_version_id points at a version; clear it so the cascade can remove versions.
  await supabase.from("scripts").update({ current_version_id: null }).eq("id", scriptId);
  await supabase.from("scripts").delete().eq("id", scriptId);
  revalidatePath(`/projects/${data.project_id}`, "layout");
  redirect(`/projects/${data.project_id}/scripts`);
}
