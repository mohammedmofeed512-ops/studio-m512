"use client";

import { useEffect, useState, useTransition } from "react";
import { confirmCallSheet, markCallSheetOpened } from "@/lib/schedule-actions";

/** Records the open (in a real browser, not link previews) and lets the recipient confirm. */
export function PublicActions({
  token,
  confirmed,
  trackOpen,
  labels,
}: {
  token: string;
  confirmed: boolean;
  trackOpen: boolean;
  labels: { confirm: string; confirmed: string; print: string };
}) {
  const [done, setDone] = useState(confirmed);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (trackOpen) void markCallSheetOpened(token);
  }, [token, trackOpen]);
  return (
    <div className="no-print mx-auto flex w-full max-w-[8.5in] flex-wrap items-center justify-between gap-3 px-4 py-4">
      {done ? (
        <p role="status" className="rounded-lg bg-ok-tint px-4 py-2.5 font-bold text-ok">
          ✓ {labels.confirmed}
        </p>
      ) : (
        <button
          type="button"
          className="btn-primary h-11 px-6 text-[14px]"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await confirmCallSheet(token);
              if (r.ok) setDone(true);
            })
          }
        >
          {labels.confirm}
        </button>
      )}
      <button type="button" className="btn-ghost border border-line" onClick={() => window.print()}>
        {labels.print}
      </button>
    </div>
  );
}
