import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { IconAdmin } from "@/components/icons";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AccountsTable, type AccountRow } from "@/components/admin/accounts-table";
import { formatBytes } from "@/lib/plan";
import { getI18n } from "@/lib/i18n/server";
import { getPlan, getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const [{ t, locale, intlLocale }, me, { supabase }] = await Promise.all([getI18n(), getPlan(), getViewer()]);
  if (me.role === "user") notFound();
  const [{ data: stats }, { data: accounts }, { data: plans }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.rpc("admin_accounts"),
    supabase.from("plans").select("id, name_ar, name_en").order("position"),
  ]);
  const a = t.admin;
  const s = (stats ?? {}) as Record<string, number | Record<string, number>>;
  const planList = (plans ?? []).map((p) => ({ id: p.id, name: locale === "ar" ? p.name_ar : p.name_en }));
  const byPlan = (s.by_plan ?? {}) as Record<string, number>;
  const tiles: Array<[string, string]> = [
    [a.users, String(s.users ?? 0)],
    [a.newUsers, String(s.new_users_30d ?? 0)],
    [a.active, String(s.active_7d ?? 0)],
    [a.projects, String(s.projects ?? 0)],
    [a.scripts, String(s.scripts ?? 0)],
    [a.storage, formatBytes(Number(s.storage_bytes ?? 0))],
  ];

  return (
    <>
      <PageHeader crumbs={a.title} />
      <SubToolbar icon={<IconAdmin size={14} />} title={a.title}>
        <AdminTabs active="overview" t={a} />
      </SubToolbar>
      <main className="flex flex-col gap-3 p-6 max-sm:p-3">
        <section aria-label={a.overview} className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {tiles.map(([label, value]) => (
            <div key={label} className="card px-5 py-4">
              <p className="text-[11px] font-bold text-muted">{label}</p>
              <p className="mt-1 text-[22px] font-extrabold" dir="ltr" style={{ textAlign: "start" }}>
                {value}
              </p>
            </div>
          ))}
          <div className="card px-5 py-4">
            <p className="text-[11px] font-bold text-muted">{a.byPlan}</p>
            <ul className="mt-1 text-[12px]">
              {planList.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="font-bold">{byPlan[p.id] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <AccountsTable rows={(accounts ?? []) as AccountRow[]} plans={planList} canEdit={me.role === "admin"} locale={intlLocale} t={a} />
      </main>
    </>
  );
}
