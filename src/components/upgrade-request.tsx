"use client";

import { useState, useTransition } from "react";
import { requestUpgrade, withdrawUpgrade } from "@/lib/admin-actions";
import { fill } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** "Request upgrade" on My plan: pick a plan, add a note, wait for an admin. */
export function UpgradeRequest({
  plans,
  pending,
  lastRejected,
  t,
}: {
  plans: Array<{ id: string; name: string }>;
  pending: { id: string; planName: string } | null;
  lastRejected: boolean;
  t: Dictionary["plan"];
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(plans[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, start] = useTransition();

  if (pending)
    return (
      <div className="rounded-lg bg-tint px-4 py-3 text-[12px]">
        <p className="font-bold text-accent-ink">{fill(t.pending, { plan: pending.planName })}</p>
        <button type="button" className="btn-ghost mt-2 h-7 px-2 text-[11px]" disabled={busy} onClick={() => start(() => withdrawUpgrade(pending.id))}>
          {t.withdraw}
        </button>
      </div>
    );
  if (!plans.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {lastRejected ? <p className="text-[11px] text-warn">{t.rejected}</p> : null}
      {status ? (
        <p role="status" className="text-[12px] font-bold text-ok">
          {status}
        </p>
      ) : null}
      {!open ? (
        <button type="button" className="btn-primary self-start" onClick={() => setOpen(true)}>
          {t.requestUpgrade}
        </button>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-lg bg-ground/70 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await requestUpgrade(plan, message);
              if (r.ok) {
                setOpen(false);
                setStatus(t.sent);
              }
            });
          }}
        >
          <label>
            <span className="label">{t.choosePlan}</span>
            <select className="field" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.message}</span>
            <textarea rows={2} maxLength={1000} className="field h-auto py-2" value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <button className="btn-primary self-start" disabled={busy}>
            {t.send}
          </button>
        </form>
      )}
    </div>
  );
}
