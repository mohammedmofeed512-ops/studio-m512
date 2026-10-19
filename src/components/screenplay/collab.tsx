"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { fill } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const HEARTBEAT_MS = 20_000;
const FRESH_MS = 60_000;

/** Who else has this script open: each editor writes a heartbeat row every 20 seconds. */
export function usePresence(scriptId: string, name: string, enabled: boolean) {
  const [others, setOthers] = useState<string[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const db = browserClient();
    let stopped = false;
    let me: string | null = null;
    const beat = async () => {
      const { data: auth } = await db.auth.getUser();
      me = auth.user?.id ?? null;
      if (!me || stopped) return;
      await db.from("script_presence").upsert({ script_id: scriptId, user_id: me, name, seen_at: new Date().toISOString() });
      const since = new Date(Date.now() - FRESH_MS).toISOString();
      const { data } = await db.from("script_presence").select("user_id, name").eq("script_id", scriptId).gte("seen_at", since);
      if (!stopped) setOthers((data ?? []).filter((r) => r.user_id !== me).map((r) => r.name));
    };
    void beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    const leave = () => {
      if (me) void db.from("script_presence").delete().eq("script_id", scriptId).eq("user_id", me);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [scriptId, name, enabled]);
  return others;
}

export function PresenceBadges({ names, label }: { names: string[]; label: string }) {
  if (!names.length) return null;
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ok" role="status">
      <span aria-hidden className="size-2 rounded-full bg-ok" />
      {names.join("، ")} · {label}
    </span>
  );
}

/** Shown when someone else saved this script after we loaded it. */
export function ConflictBar({ by, t, onReload, onOverwrite }: { by: string; t: Dictionary["presence"]; onReload: () => void; onOverwrite: () => void }) {
  return (
    <div role="alert" className="no-print flex flex-wrap items-center gap-2 bg-warn-tint px-6 py-2.5 text-[12px] font-bold text-warn">
      <span className="flex-1">{fill(t.conflict, { name: by || t.someone })}</span>
      <button type="button" className="btn h-8 bg-white px-3 text-ink hover:bg-ground" onClick={onReload}>
        {t.reload}
      </button>
      <button type="button" className="btn h-8 bg-warn px-3 text-white hover:opacity-90" onClick={onOverwrite}>
        {t.overwrite}
      </button>
    </div>
  );
}
