import "server-only";
import { cache } from "react";
import { FULL, normalizeLevels, type Access } from "@/lib/permissions";
import { getViewer } from "@/lib/viewer";

/** The signed-in user's access to a project, or null when they are not part of it. */
export const getAccess = cache(async (projectId: string): Promise<Access | null> => {
  const { supabase, userId } = await getViewer();
  const [{ data: project }, { data: member }] = await Promise.all([
    supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle(),
    supabase.from("project_members").select("permissions").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!project) return null;
  if (project.owner_id === userId) return { isOwner: true, ownerId: project.owner_id, levels: { ...FULL } };
  return { isOwner: false, ownerId: project.owner_id, levels: normalizeLevels(member?.permissions) };
});
