"use client";

import { useState, useTransition } from "react";
import { handleUpgrade } from "@/lib/admin-actions";
import { fill } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type RequestRow = { id: string; name: string; email: string; fromPlan: string; toPlan: string; message: string | null; createdAt: string };

function Row({ r, canEdit, t }: { r: RequestRow; canEdit: boolean; t: Dictionary["admin"] }) {
  const [months, setMonths] = useState(0);
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
      <span className="min-w-[200px] flex-1">
        <span className="block font-bold">
          {r.name} <span className="text-[12px] font-normal text-muted" dir="ltr">{r.email}</span>
        </span>
        <span className="text-[12px] text-body">
          {t.from} {r.fromPlan} {t.to} <b>{r.toPlan}</b> · {r.createdAt}
        </span>
        {r.message ? <span className="mt-1 block text-[12px] italic text-muted">“{r.message}”</span> : null}
      </span>
      {canEdit ? (
        <span className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
            {t.duration}
            <select className="field h-8 w-auto py-0 text-[12px]" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              <option value={0}>{t.forever}</option>
              {[1, 3, 6, 12].map((n) => (
                <option key={n} value={n}>
                  {fill(t.months, { n })}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary h-8" disabled={pending} onClick={() => start(async () => void (await handleUpgrade(r.id, true, months)))}>
            {t.approve}
          </button>
          <button type="button" className="btn-danger h-8" disabled={pending} onClick={() => start(async () => void (await handleUpgrade(r.id, false, 0)))}>
            {t.reject}
          </button>
        </span>
      ) : null}
    </li>
  );
}

export function UpgradeRequests({ rows, canEdit, t }: { rows: RequestRow[]; canEdit: boolean; t: Dictionary["admin"] }) {
  return (
    <section aria-labelledby="req-h" className="card overflow-hidden">
      <div className="card-head">
        <h2 id="req-h" className="card-title">
          {t.requests}
        </h2>
        {rows.length ? <span className="badge bg-accent text-white">{rows.length}</span> : null}
      </div>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <Row key={r.id} r={r} canEdit={canEdit} t={t} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-5 text-center text-[12px] text-muted">{t.noRequests}</p>
      )}
    </section>
  );
}
