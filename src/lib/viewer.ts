import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";

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
