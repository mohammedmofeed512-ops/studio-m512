import "server-only";
import type { requireUser } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/**
 * Records what someone did in a project. Repeated edits of the same thing by the same
 * person within `throttleMinutes` are logged once. Never throws: logging must not break saving.
 */
export async function logActivity(
  supabase: Supabase,
  input: { projectId: string; userId: string; action: string; summary?: string | null; targetId?: string | null; throttleMinutes?: number },
) {
  try {
    if (input.throttleMinutes) {
      const since = new Date(Date.now() - input.throttleMinutes * 60_000).toISOString();
      let q = supabase.from("activity_log").select("id").eq("project_id", input.projectId).eq("user_id", input.userId).eq("action", input.action).gte("created_at", since).limit(1);
      if (input.targetId) q = q.eq("target_id", input.targetId);
      const { data } = await q;
      if (data?.length) return;
    }
    await supabase.from("activity_log").insert({
      project_id: input.projectId,
      user_id: input.userId,
      action: input.action,
      summary: input.summary?.slice(0, 200) ?? null,
      target_id: input.targetId ?? null,
    });
  } catch (e) {
    console.error("logActivity", e);
  }
}
