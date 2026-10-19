import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { ProjectForm } from "@/components/project-form";
import { TaskRow } from "@/components/task-row";
import { ConfirmButton } from "@/components/confirm-button";
import { IconProjects, IconTasks } from "@/components/icons";
import { createTask, deleteProject } from "@/lib/actions";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { getAccess } from "@/lib/access";
import { canEdit, canView } from "@/lib/permissions";
import { EditGate } from "@/components/access";
import { ActivityFeed } from "@/components/activity-feed";

export async function generateMetadata({ params }: PageProps<"/projects/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getViewer();
  const { data } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Project" };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ t, formatDate }, { supabase }] = await Promise.all([getI18n(), getViewer()]);

  const [{ data: project }, { data: tasks }, access] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("tasks").select("id, title, status, due_date").eq("project_id", id).order("status").order("position", { ascending: false }),
    getAccess(id),
  ]);
  if (!project || !access) notFound();

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href="/projects" className="text-muted hover:text-ink">
              {t.projects.title}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {project.name}
          </>
        }
      />
      <SubToolbar icon={<IconProjects size={14} />} title={t.projects.overview} meta={`${t.projectTypes[project.type]} · ${t.projectStages[project.stage]}`} />

      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={project.id} />

        <main className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(340px,1fr))] content-start gap-3 p-6 max-sm:grid-cols-1 max-sm:p-4">
          <section aria-labelledby="details-h" className="card overflow-hidden">
            <div className="card-head">
              <h2 id="details-h" className="card-title">
                {t.projects.details}
              </h2>
            </div>
            <div className="p-6">
              <EditGate editable={access.isOwner}>
                <ProjectForm t={t} project={project} />
              </EditGate>
            </div>
            {access.isOwner ? (
              <form action={deleteProject} className="border-t border-line px-6 py-3">
                <input type="hidden" name="id" value={project.id} />
                <ConfirmButton className="btn-danger h-8 px-2" message={t.projects.deleteConfirm}>
                  {t.common.delete}
                </ConfirmButton>
              </form>
            ) : null}
          </section>

          <ActivityFeed projectId={project.id} />

          {canView(access, "tasks") ? <section aria-labelledby="ptasks-h" className="card self-start overflow-hidden">
            <div className="card-head">
              <div className="flex items-center gap-3">
                <span className="icon-dot">
                  <IconTasks size={16} />
                </span>
                <h2 id="ptasks-h" className="card-title">
                  {t.projects.projectTasks}
                </h2>
              </div>
            </div>
            {canEdit(access, "tasks") ? <form action={createTask} className="flex gap-2 border-b border-line px-6 py-3">
              <input type="hidden" name="project_id" value={project.id} />
              <label htmlFor="ptask" className="sr-only">
                {t.tasks.new}
              </label>
              <input id="ptask" name="title" required maxLength={300} placeholder={t.tasks.placeholder} className="field h-9" />
              <button className="btn-soft">{t.common.add}</button>
            </form> : null}
            <EditGate editable={canEdit(access, "tasks")}>
            <div className="px-6 py-1.5">
              {tasks?.length ? (
                tasks.map((task) => <TaskRow key={task.id} task={task} t={t} dueLabel={formatDate(task.due_date)} showDelete />)
              ) : (
                <p className="py-8 text-center text-muted">{t.tasks.empty}</p>
              )}
            </div>
            </EditGate>
          </section> : null}
        </main>
      </div>
    </>
  );
}
