"use client";

import { useState, useTransition } from "react";
import { savePlan } from "@/lib/admin-actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type PlanForm = {
  id: string;
  name_ar: string;
  name_en: string;
  max_projects: string;
  max_members_per_project: string;
  storage_mb: string;
  call_sheets: boolean;
  claude: boolean;
  is_default: boolean;
  position: number;
  price_ar: string;
  price_en: string;
  description_ar: string;
  description_en: string;
  highlight: boolean;
};

function PlanCard({ initial, isNew, canEdit, t, labels }: { initial: PlanForm; isNew?: boolean; canEdit: boolean; t: Dictionary["admin"]; labels: Dictionary["plan"] }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const set = (patch: Partial<PlanForm>) => setForm((f) => ({ ...f, ...patch }));
  const num = (key: "max_projects" | "max_members_per_project" | "storage_mb", label: string) => (
    <label>
      <span className="label">{label}</span>
      <input type="number" min={0} className="field" value={form[key]} placeholder={t.emptyUnlimited} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );
  return (
    <form
      className="card flex flex-col gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await savePlan(form);
          setStatus(r.ok ? t.saved : t.failed);
          if (r.ok && isNew) setForm(initial);
        });
      }}
    >
      <fieldset disabled={!canEdit} className="contents">
        {isNew ? (
          <>
            <h2 className="card-title">{t.newPlan}</h2>
            <label>
              <span className="label">{t.planId}</span>
              <input required pattern="[a-z0-9_]{2,32}" dir="ltr" className="field" value={form.id} onChange={(e) => set({ id: e.target.value.toLowerCase() })} />
            </label>
          </>
        ) : (
          <h2 className="card-title" dir="auto">
            {form.name_ar} · <span dir="ltr">{form.id}</span>
          </h2>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">{t.planName} (ع)</span>
            <input required className="field" value={form.name_ar} onChange={(e) => set({ name_ar: e.target.value })} />
          </label>
          <label>
            <span className="label">{t.planName} (EN)</span>
            <input required dir="ltr" className="field" value={form.name_en} onChange={(e) => set({ name_en: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">{t.price} (ع)</span>
            <input className="field" maxLength={60} value={form.price_ar} onChange={(e) => set({ price_ar: e.target.value })} />
          </label>
          <label>
            <span className="label">{t.price} (EN)</span>
            <input dir="ltr" className="field" maxLength={60} value={form.price_en} onChange={(e) => set({ price_en: e.target.value })} />
          </label>
          <label>
            <span className="label">{t.description} (ع)</span>
            <textarea rows={2} maxLength={300} className="field h-auto py-2" value={form.description_ar} onChange={(e) => set({ description_ar: e.target.value })} />
          </label>
          <label>
            <span className="label">{t.description} (EN)</span>
            <textarea rows={2} dir="ltr" maxLength={300} className="field h-auto py-2" value={form.description_en} onChange={(e) => set({ description_en: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          {num("max_projects", t.maxProjects)}
          {num("max_members_per_project", t.maxMembers)}
          {num("storage_mb", t.storageMb)}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={form.call_sheets} onChange={(e) => set({ call_sheets: e.target.checked })} />
            {labels.call_sheets}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={form.claude} onChange={(e) => set({ claude: e.target.checked })} />
            {labels.claude}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={form.is_default} onChange={(e) => set({ is_default: e.target.checked })} />
            {t.isDefault}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={form.highlight} onChange={(e) => set({ highlight: e.target.checked })} />
            {t.highlight}
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={pending}>
            {isNew ? t.addPlan : t.save}
          </button>
          <span role="status" className="text-[12px] font-semibold text-muted">
            {status}
          </span>
        </div>
      </fieldset>
    </form>
  );
}

export function PlansEditor({ plans, canEdit, t, labels }: { plans: PlanForm[]; canEdit: boolean; t: Dictionary["admin"]; labels: Dictionary["plan"] }) {
  const blank: PlanForm = { id: "", name_ar: "", name_en: "", max_projects: "", max_members_per_project: "", storage_mb: "", call_sheets: true, claude: false, is_default: false, position: plans.length, price_ar: "", price_en: "", description_ar: "", description_en: "", highlight: false };
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-3 max-sm:grid-cols-1">
      {plans.map((p) => (
        <PlanCard key={p.id} initial={p} canEdit={canEdit} t={t} labels={labels} />
      ))}
      {canEdit ? <PlanCard initial={blank} isNew canEdit t={t} labels={labels} /> : null}
    </div>
  );
}
