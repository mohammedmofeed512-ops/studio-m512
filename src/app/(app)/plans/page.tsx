import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { IconAdmin } from "@/components/icons";
import { PlanCards } from "@/components/plan-cards";
import { formatBytes } from "@/lib/plan";
import { getI18n } from "@/lib/i18n/server";
import { getPlan, getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Plans" };

/** Every plan side by side, with a button to request one. */
export default async function PlansPage() {
  const [{ t, locale }, me, { supabase, userId }] = await Promise.all([getI18n(), getPlan(), getViewer()]);
  const [{ data: plans }, { data: requests }] = await Promise.all([
    supabase.from("plans").select("*").order("position"),
    supabase.from("upgrade_requests").select("id, plan_id, status").eq("user_id", userId).eq("status", "pending").limit(1),
  ]);
  const ar = locale === "ar";
  const p = t.plan;
  return (
    <>
      <PageHeader crumbs={p.plansTitle} />
      <SubToolbar icon={<IconAdmin size={14} />} title={p.plansTitle} />
      <main className="mx-auto w-full max-w-[1100px] p-6 max-sm:p-3">
        <p className="mb-6 text-center leading-relaxed text-body">{p.plansIntro}</p>
        <PlanCards
          currentId={me.plan}
          pending={requests?.[0] ? { id: requests[0].id, planId: requests[0].plan_id } : null}
          t={p}
          plans={(plans ?? []).map((x) => {
            const f = (x.features ?? {}) as Record<string, boolean>;
            return {
              id: x.id,
              name: ar ? x.name_ar : x.name_en,
              price: (ar ? x.price_ar : x.price_en) ?? null,
              description: (ar ? x.description_ar : x.description_en) ?? null,
              highlight: x.highlight,
              position: x.position,
              maxProjects: x.max_projects,
              maxMembers: x.max_members_per_project,
              storage: x.storage_mb === null ? null : formatBytes(x.storage_mb * 1024 * 1024).replace(".0 ", " "),
              callSheets: Boolean(f.call_sheets),
              claude: Boolean(f.claude),
            };
          })}
        />
        <p className="mt-6 text-center text-[11px] text-faint">{p.upgradeHint}</p>
      </main>
    </>
  );
}
