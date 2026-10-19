"use server";

import { requireUser } from "@/lib/supabase/server";

export async function markNotificationsRead() {
  const { supabase, userId } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
