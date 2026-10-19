import { getI18n } from "@/lib/i18n/server";
import { getPlan, getViewer } from "@/lib/viewer";
import { formatBytes } from "@/lib/plan";
import { UpgradeRequest } from "./upgrade-request";

function Meter({ label, used, max, unlimited, format = String }: { label: string; used: number; max: number | null; unlimited: string; format?: (n: number) => string }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="font-semibold">{label}</span>
        <span className="text-muted" dir="ltr">
          {format(used)} / {max === null ? unlimited : format(max)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ground" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-warn" : "bg-accent"}`} style={{ width: `${max === null ? 0 : pct}%` }} />
      </div>
    </div>
  );
}

/** The signed-in user's plan, what it allows and how much is used. */
export async function MyPlanCard() {
  const [{ t, locale, formatDate }, plan, { supabase, userId }] = await Promise.all([getI18n(), getPlan(), getViewer()]);
  const [{ data: plans }, { data: requests }] = await Promise.all([
    supabase.from("plans").select("id, name_ar, name_en, position").order("position"),
    supabase.from("upgrade_requests").select("id, plan_id, status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
  ]);
  const p = t.plan;
  const nameOf = (id: string) => {
    const row = plans?.find((x) => x.id === id);
    return row ? (locale === "ar" ? row.name_ar : row.name_en) : id;
  };
  const name = nameOf(plan.plan);
  const current = plans?.find((x) => x.id === plan.plan);
  const higher = (plans ?? []).filter((x) => x.id !== plan.plan && x.position >= (current?.position ?? 0)).map((x) => ({ id: x.id, name: nameOf(x.id) }));
  const last = requests?.[0];
  return (
    <section aria-labelledby="plan-h" className="card self-start overflow-hidden">
      <div className="card-head">
        <h2 id="plan-h" className="card-title">
          {p.title}
        </h2>
        <span className="badge bg-tint text-accent-ink">{name}</span>
      </div>
      <div className="flex flex-col gap-4 p-6">
        <p className="text-[12px] text-muted">
          {plan.expires_at ? `${p.expires} ${formatDate(plan.expires_at, { day: "numeric", month: "long", year: "numeric" })}` : p.noExpiry}
        </p>
        <Meter label={p.projects} used={plan.projects_used} max={plan.max_projects} unlimited={p.unlimited} />
        <Meter
          label={p.storage}
          used={plan.storage_used_bytes}
          max={plan.storage_mb === null ? null : plan.storage_mb * 1024 * 1024}
          unlimited={p.unlimited}
          format={formatBytes}
        />
        <div className="flex justify-between text-[12px]">
          <span className="font-semibold">{p.members}</span>
          <span className="text-muted">{plan.max_members ?? p.unlimited}</span>
        </div>
        <ul className="grid gap-1.5 border-t border-line pt-3 text-[12px]">
          {(["call_sheets", "claude"] as const).map((f) => (
            <li key={f} className="flex justify-between">
              <span>{p[f]}</span>
              <span className={`font-bold ${plan.features[f] ? "text-ok" : "text-faint"}`}>{plan.features[f] ? p.yes : p.no}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line pt-3">
          <p className="mb-2 text-[11px] text-faint">{p.upgradeHint}</p>
          <UpgradeRequest
            plans={higher}
            pending={last?.status === "pending" ? { id: last.id, planName: nameOf(last.plan_id) } : null}
            lastRejected={last?.status === "rejected"}
            t={p}
          />
        </div>
      </div>
    </section>
  );
}
