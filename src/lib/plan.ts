/** The signed-in user's plan as returned by my_plan(). */
export type MyPlan = {
  plan: string;
  max_projects: number | null;
  max_members: number | null;
  storage_mb: number | null;
  features: Record<string, boolean>;
  projects_used: number;
  storage_used_bytes: number;
  expires_at: string | null;
  role: "user" | "support" | "admin";
  suspended: boolean;
};

export type PlanErrorKey = "limitProjects" | "limitMembers" | "featureCallSheets" | "storageFull";

/** Maps a database error raised by the plan triggers to a message key. */
export function planError(message: string | null | undefined): PlanErrorKey | null {
  if (!message) return null;
  if (message.includes("plan_limit:projects")) return "limitProjects";
  if (message.includes("plan_limit:members")) return "limitMembers";
  if (message.includes("plan_feature:call_sheets")) return "featureCallSheets";
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
