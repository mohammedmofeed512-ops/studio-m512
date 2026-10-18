import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { IconProjects, IconScript, IconTasks } from "@/components/icons";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Home" };

const APP_TIME_ZONE = "Asia/Gaza";

export default async function DashboardPage() {
  const [{ t, locale, intlLocale, formatDate }, viewer] = await Promise.all([getI18n(), getViewer()]);
  const { supabase } = viewer;

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("id, name, type, stage, cover_color, delivery_date").neq("stage", "archived").order("updated_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id, title, status, due_date, project:projects(name)").neq("status", "done").order("position", { ascending: false }).limit(7),
  ]);

  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: APP_TIME_ZONE }).format(now));
  const greeting = hour < 12 ? t.dashboard.morning : t.dashboard.afternoon;
  const today = new Intl.DateTimeFormat(intlLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE }).format(now);
  const firstName = viewer.name.split(/\s+/)[0];

  return (
    <>
      <PageHeader crumbs={t.nav.home} />
      <main className="flex flex-col gap-3 px-8 pb-12 pt-7 max-sm:px-4">
        <div className="pb-7 pt-2 text-center">
          <div className="text-[18px] font-semibold">{today}</div>
          <h1 className="mt-1.5 text-[30px] font-extrabold">
            {greeting}
            {locale === "ar" ? "، " : ", "}
            {firstName}
          </h1>
        </div>

        {!projects?.length ? (
          <section className="card flex items-start gap-4 px-6 py-5">
            <span className="icon-dot">
              <IconScript size={16} />
            </span>
            <div className="flex-1">
              <h2 className="mb-1.5 mt-1 text-[16px] font-extrabold">{t.dashboard.welcomeTitle}</h2>
              <p className="mb-3 leading-relaxed text-body">{t.dashboard.welcomeBody}</p>
              <Link href="/projects/new" className="btn-soft h-8">
                {t.projects.new}
              </Link>
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-3 max-sm:grid-cols-1">
          <section aria-labelledby="w-projects" className="card overflow-hidden">
            <div className="card-head">
              <div className="flex items-center gap-3">
                <span className="icon-dot">
                  <IconProjects size={16} />
                </span>
                <h2 id="w-projects" className="text-[18px] font-extrabold">
                  <Link href="/projects" className="hover:underline">
                    {t.dashboard.recentProjects}
                  </Link>
                </h2>
              </div>
              <Link href="/projects/new" className="btn-primary h-8">
                + {t.projects.new}
              </Link>
            </div>
            {projects?.length ? (
              projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3.5 border-b border-line px-6 py-3.5 last:border-b-0 hover:bg-ground/60">
                  <span className="h-10 w-14 shrink-0 rounded-md" style={{ background: p.cover_color ?? "#2B3240" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{p.name}</span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {t.projectTypes[p.type]} · {t.projectStages[p.stage]}
                    </span>
                  </span>
                  <span className="text-[12px] text-muted">{formatDate(p.delivery_date) || t.common.none}</span>
                </Link>
              ))
            ) : (
              <p className="px-6 py-10 text-center text-muted">
                {t.dashboard.noProjects}
                <br />
                {t.dashboard.noProjectsHint}
              </p>
            )}
          </section>

          <section aria-labelledby="w-tasks" className="card overflow-hidden">
            <div className="card-head">
              <div className="flex items-center gap-3">
                <span className="icon-dot">
                  <IconTasks size={16} />
                </span>
                <h2 id="w-tasks" className="text-[18px] font-extrabold">
                  <Link href="/tasks" className="hover:underline">
                    {t.dashboard.myTasks}
                  </Link>
                </h2>
              </div>
              <Link href="/tasks" className="btn-soft h-8">
                {t.dashboard.viewAll}
              </Link>
            </div>
            <div className="px-6 py-1.5">
              {tasks?.length ? (
                tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    t={t}
                    projectName={(task.project as { name: string } | null)?.name}
                    dueLabel={formatDate(task.due_date)}
                  />
                ))
              ) : (
                <p className="py-10 text-center text-muted">{t.dashboard.noTasks}</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
