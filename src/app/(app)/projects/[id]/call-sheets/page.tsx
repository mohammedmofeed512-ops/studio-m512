import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconCalendar } from "@/components/icons";
import { isUuid } from "@/lib/production/load";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { getAccess } from "@/lib/access";
import { canView } from "@/lib/permissions";
import { NoAccessPage } from "@/components/access";

export const metadata: Metadata = { title: "Call Sheets" };

export default async function CallSheetsPage({ params }: PageProps<"/projects/[id]/call-sheets">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [{ t, formatDate }, { supabase }] = await Promise.all([getI18n(), getViewer()]);
  const [{ data: project }, { data: days }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("shoot_days")
      .select("id, day_number, shoot_date, general_call, location:contacts!shoot_days_location_contact_id_fkey(full_name), shoot_day_scenes(scene_id), call_sheets(id, call_sheet_recipients(status))")
      .eq("project_id", id)
      .order("day_number"),
  ]);
  const access = await getAccess(id);
  if (!project || !access) notFound();
  if (!canView(access, "call_sheets")) return <NoAccessPage projectId={id} projectName={project.name} title={t.callSheets.title} t={t} />;
  const cs = t.callSheets;

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {cs.title}
          </>
        }
      />
      <SubToolbar icon={<IconCalendar size={14} />} title={cs.title} meta={`${days?.length ?? 0} ${t.schedule.days}`} />
      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={id} />
        <main className="min-w-0 flex-1 p-6 max-sm:p-3">
          {!days?.length ? (
            <div className="card px-6 py-14 text-center text-muted">
              {cs.empty}{" "}
              <Link href={`/projects/${id}/schedule`} className="font-bold text-accent-ink">
                {cs.toSchedule}
              </Link>
            </div>
          ) : (
            <div className="card overflow-x-auto px-4 py-2">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr>
                    <th className="th">{t.schedule.day}</th>
                    <th className="th">{t.schedule.date}</th>
                    <th className="th">{t.schedule.generalCall}</th>
                    <th className="th">{t.schedule.location}</th>
                    <th className="th">{t.schedule.scenes}</th>
                    <th className="th">{cs.status}</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => {
                    const sheet = Array.isArray(d.call_sheets) ? d.call_sheets[0] : d.call_sheets;
                    const recips: Array<{ status: string }> = sheet?.call_sheet_recipients ?? [];
                    const sent = recips.filter((r) => r.status !== "pending").length;
                    const confirmed = recips.filter((r) => r.status === "confirmed").length;
                    const loc = Array.isArray(d.location) ? d.location[0] : d.location;
                    return (
                      <tr key={d.id} className="hover:bg-ground/60">
                        <td className="td font-extrabold">
                          <Link href={`/projects/${id}/call-sheets/${d.id}`} className="hover:text-accent-ink">
                            {t.schedule.day} {d.day_number}
                          </Link>
                        </td>
                        <td className="td">{d.shoot_date ? formatDate(d.shoot_date, { weekday: "short", day: "numeric", month: "short" }) : "—"}</td>
                        <td className="td" dir="ltr">
                          {d.general_call?.slice(0, 5) ?? "—"}
                        </td>
                        <td className="td">{loc?.full_name ?? "—"}</td>
                        <td className="td">{d.shoot_day_scenes.length}</td>
                        <td className="td">
                          {recips.length ? (
                            <span className="flex flex-wrap gap-1.5">
                              <span className="badge bg-tint text-accent-ink">
                                {sent}/{recips.length} {cs.sentCount}
                              </span>
                              <span className="badge bg-ok-tint text-ok">
                                {confirmed} {cs.confirmedCount}
                              </span>
                            </span>
                          ) : (
                            <span className="badge bg-ground text-muted">{cs.draft}</span>
                          )}
                        </td>
                        <td className="td text-end">
                          <Link href={`/projects/${id}/call-sheets/${d.id}`} className="btn-soft h-8">
                            {cs.open}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
