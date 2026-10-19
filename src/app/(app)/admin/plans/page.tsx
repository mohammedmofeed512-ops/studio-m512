import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { IconAdmin } from "@/components/icons";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { PlansEditor } from "@/components/admin/plans-editor";
import { getI18n } from "@/lib/i18n/server";
import { getPlan, getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Plans" };

const str = (n: number | null) => (n === null ? "" : String(n));

export default async function AdminPlansPage() {
  const [{ t }, me, { supabase }] = await Promise.all([getI18n(), getPlan(), getViewer()]);
  if (me.role === "user") notFound();
  const { data: plans } = await supabase.from("plans").select("*").order("position");
  const a = t.admin;
  return (
    <>
      <PageHeader crumbs={a.title} />
      <SubToolbar icon={<IconAdmin size={14} />} title={a.plans}>
        <AdminTabs active="plans" t={a} />
      </SubToolbar>
      <main className="p-6 max-sm:p-3">
        <PlansEditor
          canEdit={me.role === "admin"}
          t={a}
          labels={t.plan}
          plans={(plans ?? []).map((p) => {
            const f = (p.features ?? {}) as Record<string, boolean>;
            return {
              id: p.id,
              name_ar: p.name_ar,
              name_en: p.name_en,
              max_projects: str(p.max_projects),
              max_members_per_project: str(p.max_members_per_project),
              storage_mb: str(p.storage_mb),
              call_sheets: Boolean(f.call_sheets),
              claude: Boolean(f.claude),
              is_default: p.is_default,
              position: p.position,
              price_ar: p.price_ar ?? "",
              price_en: p.price_en ?? "",
              description_ar: p.description_ar ?? "",
              description_en: p.description_en ?? "",
              highlight: p.highlight,
            };
          })}
        />
      </main>
    </>
  );
}
