import "server-only";
import type { getViewer } from "@/lib/viewer";
import { docToLines, type ScriptLine } from "@/lib/screenplay/model";

type Supabase = Awaited<ReturnType<typeof getViewer>>["supabase"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The project, its screenplays, the chosen one (from ?script= or the latest edited),
 * its scenes in order and its current text as lines.
 */
export async function loadProjectScenes(supabase: Supabase, projectId: string, scriptParam?: string | string[]) {
  const [{ data: project }, { data: scripts }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle(),
    supabase.from("scripts").select("id, title, language, current_version_id").eq("project_id", projectId).eq("kind", "screenplay").order("updated_at", { ascending: false }),
  ]);
  const wanted = typeof scriptParam === "string" && UUID.test(scriptParam) ? scriptParam : null;
  const script = scripts?.find((s) => s.id === wanted) ?? scripts?.[0] ?? null;
  if (!project || !script) return { project, scripts: scripts ?? [], script: null, scenes: [], lines: [] as ScriptLine[] };

  const [{ data: scenes }, { data: version }] = await Promise.all([
    supabase.from("scenes").select("id, scene_number, int_ext, location_name, day_night, page_eighths, position, synopsis").eq("script_id", script.id).order("position"),
    supabase.from("script_versions").select("content").eq("id", script.current_version_id ?? "").maybeSingle(),
  ]);
  return { project, scripts: scripts ?? [], script, scenes: scenes ?? [], lines: docToLines(version?.content) };
}

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
