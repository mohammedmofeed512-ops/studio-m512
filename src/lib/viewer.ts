import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import type { MyPlan } from "@/lib/plan";

/** The signed-in user plus their profile, read once per request. */
export const getViewer = cache(async () => {
  const { supabase, userId, email } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return {
    supabase,
    userId,
    email,
    name: profile?.full_name || email.split("@")[0] || "Studio M512",
    company: profile?.company_name || "Studio M512",
    profile,
  };
});

/** The signed-in user's plan, limits, usage, platform role and suspension, read once per request. */
export const getPlan = cache(async (): Promise<MyPlan> => {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("my_plan");
  const p = (data ?? {}) as Partial<MyPlan>;
  return {
    plan: p.plan ?? "free",
    max_projects: p.max_projects ?? null,
    max_members: p.max_members ?? null,
    storage_mb: p.storage_mb ?? null,
    features: p.features ?? {},
    projects_used: Number(p.projects_used ?? 0),
    storage_used_bytes: Number(p.storage_used_bytes ?? 0),
    expires_at: p.expires_at ?? null,
    role: p.role === "admin" || p.role === "support" ? p.role : "user",
    suspended: Boolean(p.suspended),
  };
});
