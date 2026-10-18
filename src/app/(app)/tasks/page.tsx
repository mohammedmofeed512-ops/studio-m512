import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { IconTasks } from "@/components/icons";
import { createTask, deleteTask, setTaskStatus } from "@/lib/actions";
import { TASK_STATUSES, type TaskStatus } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Tasks" };

const NEXT: Record<TaskStatus, TaskStatus | null> = { todo: "in_progress", in_progress: "done", done: null };

export default async function TasksPage() {
  const [{ t, formatDate }, { supabase }] = await Promise.all([getI18n(), getViewer()]);
  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase.from("tasks").select("id, title, status, due_date, project:projects(id, name)").order("position", { ascending: false }),
    supabase.from("projects").select("id, name").neq("stage", "archived").order("name"),
  ]);

  const byStatus = (s: TaskStatus) => (tasks ?? []).filter((task) => task.status === s);

  return (
    <>
      <PageHeader crumbs={t.tasks.title} />
      <SubToolbar icon={<IconTasks size={14} />} title={t.tasks.title} meta={`${tasks?.length ?? 0}`} />

      <main className="flex flex-col gap-3 p-6 max-sm:p-4">
        <form action={createTask} className="card flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="min-w-[220px] flex-[3]">
            <label htmlFor="title" className="label">
              {t.tasks.new}
            </label>
            <input id="title" name="title" required maxLength={300} placeholder={t.tasks.placeholder} className="field" />
          </div>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="project_id" className="label">
              {t.tasks.project}
            </label>
            <select id="project_id" name="project_id" className="field" defaultValue="">
              <option value="">{t.tasks.noProject}</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[150px] flex-1">
            <label htmlFor="due_date" className="label">
              {t.tasks.due}
            </label>
            <input id="due_date" name="due_date" type="date" className="field" />
          </div>
          <button className="btn-primary h-10">+ {t.common.add}</button>
        </form>

        <div className="grid grid-cols-3 items-start gap-3 max-lg:grid-cols-1">
          {TASK_STATUSES.map((status) => {
            const list = byStatus(status);
            const next = NEXT[status];
            return (
              <section key={status} aria-labelledby={`col-${status}`} className="card overflow-hidden">
                <div className="card-head py-3.5">
                  <h2 id={`col-${status}`} className="text-[14px] font-extrabold">
                    {t.tasks[status]}
                  </h2>
                  <span className="badge bg-tint text-accent-ink">{list.length}</span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  {list.length ? (
                    list.map((task) => {
                      const project = task.project as { id: string; name: string } | null;
                      return (
                        <article key={task.id} className="rounded-lg border border-line px-3.5 py-3">
                          <p className={`font-semibold leading-relaxed ${status === "done" ? "text-muted line-through" : ""}`}>{task.title}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                            {project ? <span>{project.name}</span> : null}
                            {task.due_date ? <span>{formatDate(task.due_date)}</span> : null}
                          </div>
                          <div className="mt-2.5 flex items-center gap-1.5">
                            {next ? (
                              <form action={setTaskStatus}>
                                <input type="hidden" name="id" value={task.id} />
                                <input type="hidden" name="status" value={next} />
                                <button className="btn-soft h-7 px-2.5 text-[11px]">{next === "done" ? t.tasks.markDone : t.tasks.start}</button>
                              </form>
                            ) : (
                              <form action={setTaskStatus}>
                                <input type="hidden" name="id" value={task.id} />
                                <input type="hidden" name="status" value="todo" />
                                <button className="btn-ghost h-7 px-2.5 text-[11px]">{t.tasks.reopen}</button>
                              </form>
                            )}
                            <form action={deleteTask} className="ms-auto">
                              <input type="hidden" name="id" value={task.id} />
                              <button className="btn-ghost h-7 px-2 text-[11px]">{t.common.delete}</button>
                            </form>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <p className="py-6 text-center text-muted">{t.tasks.empty}</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
