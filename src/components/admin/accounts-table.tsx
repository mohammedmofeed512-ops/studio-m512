"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { updateAccount } from "@/lib/admin-actions";
import { formatBytes } from "@/lib/plan";
import { matchesSearch } from "@/lib/project-tools";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type AccountRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  plan_id: string;
  plan_expires_at: string | null;
  role: string;
  suspended: boolean;
  extra_projects: number;
  extra_members: number;
  extra_storage_mb: number;
  notes: string | null;
  projects: number;
  storage_bytes: number;
  created_at: string;
  last_sign_in_at: string | null;
};

function Editor({ row, plans, t, onDone }: { row: AccountRow; plans: Array<{ id: string; name: string }>; t: Dictionary["admin"]; onDone: () => void }) {
  const [form, setForm] = useState({
    plan: row.plan_id,
    expires: row.plan_expires_at?.slice(0, 10) ?? "",
    role: row.role,
    suspended: row.suspended,
    extraProjects: row.extra_projects,
    extraMembers: row.extra_members,
    extraStorageMb: row.extra_storage_mb,
    notes: row.notes ?? "",
  });
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  return (
    <form
      className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 bg-ground/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateAccount({ userId: row.user_id, ...form });
          setStatus(r.ok ? t.saved : r.error === "selfDemote" ? t.selfDemote : t.failed);
          if (r.ok) onDone();
        });
      }}
    >
      <label>
        <span className="label">{t.plan}</span>
        <select className="field" value={form.plan} onChange={(e) => set({ plan: e.target.value })}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.expiresAt}</span>
        <input type="date" className="field" value={form.expires} onChange={(e) => set({ expires: e.target.value })} />
      </label>
      <label>
        <span className="label">{t.role}</span>
        <select className="field" value={form.role} onChange={(e) => set({ role: e.target.value })}>
          {(["user", "support", "admin"] as const).map((r) => (
            <option key={r} value={r}>
              {t.roles[r]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">{t.extraProjects}</span>
        <input type="number" min={0} className="field" value={form.extraProjects} onChange={(e) => set({ extraProjects: Number(e.target.value) })} />
      </label>
      <label>
        <span className="label">{t.extraMembers}</span>
        <input type="number" min={0} className="field" value={form.extraMembers} onChange={(e) => set({ extraMembers: Number(e.target.value) })} />
      </label>
      <label>
        <span className="label">{t.extraStorage}</span>
        <input type="number" min={0} className="field" value={form.extraStorageMb} onChange={(e) => set({ extraStorageMb: Number(e.target.value) })} />
      </label>
      <label className="col-span-full">
        <span className="label">{t.notes}</span>
        <textarea rows={2} className="field h-auto py-2" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 font-semibold text-warn">
        <input type="checkbox" checked={form.suspended} onChange={(e) => set({ suspended: e.target.checked })} className="size-4 accent-[var(--color-warn)]" />
        {t.suspend}
      </label>
      <div className="col-span-full flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {t.save}
        </button>
        <span role="status" className="text-[12px] font-semibold text-muted">
          {status}
        </span>
      </div>
    </form>
  );
}

export function AccountsTable({
  rows,
  plans,
  canEdit,
  locale,
  t,
}: {
  rows: AccountRow[];
  plans: Array<{ id: string; name: string }>;
  canEdit: boolean;
  locale: string;
  t: Dictionary["admin"];
}) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(
    () => rows.filter((r) => (!plan || r.plan_id === plan) && matchesSearch(`${r.full_name ?? ""} ${r.email} ${r.company_name ?? ""}`, query)),
    [rows, plan, query],
  );
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : t.never);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  return (
    <section aria-label={t.accounts} className="card overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} className="field h-9 min-w-[200px] flex-1" aria-label={t.search} />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="field h-9 w-auto" aria-label={t.plan}>
          <option value="">{t.allPlans}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {!canEdit ? <p className="border-b border-line px-4 py-2 text-[12px] text-muted">{t.supportReadOnly}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              <th className="th ps-4">{t.name}</th>
              <th className="th">{t.plan}</th>
              <th className="th">{t.usage}</th>
              <th className="th">{t.joined}</th>
              <th className="th">{t.lastSeen}</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <Fragment key={r.user_id}>
                <tr className={r.suspended ? "bg-warn-tint/40" : undefined}>
                  <td className="td ps-4">
                    <span className="block font-bold">
                      {r.full_name || r.company_name || "—"}
                      {r.role !== "user" ? <span className="badge ms-2 bg-tint text-accent-ink">{t.roles[r.role as "admin" | "support"]}</span> : null}
                      {r.suspended ? <span className="badge ms-2 bg-warn-tint text-warn">{t.suspendedOne}</span> : null}
                    </span>
                    <span className="text-[12px] text-muted" dir="ltr">
                      {r.email}
                    </span>
                  </td>
                  <td className="td">
                    <span className="font-semibold">{planName(r.plan_id)}</span>
                    {r.plan_expires_at ? <span className="block text-[11px] text-muted">{date(r.plan_expires_at)}</span> : null}
                  </td>
                  <td className="td text-[12px]">
                    {r.projects} {t.projectsShort} · <span dir="ltr">{formatBytes(r.storage_bytes)}</span>
                  </td>
                  <td className="td text-[12px]">{date(r.created_at)}</td>
                  <td className="td text-[12px]">{date(r.last_sign_in_at)}</td>
                  <td className="td text-end">
                    {canEdit ? (
                      <button type="button" className="btn-ghost h-8 border border-line" aria-expanded={open === r.user_id} onClick={() => setOpen(open === r.user_id ? null : r.user_id)}>
                        {t.edit}
                      </button>
                    ) : null}
                  </td>
                </tr>
                {open === r.user_id ? (
                  <tr>
                    <td colSpan={6} className="border-b border-line p-0">
                      <Editor row={r} plans={plans} t={t} onDone={() => setOpen(null)} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
