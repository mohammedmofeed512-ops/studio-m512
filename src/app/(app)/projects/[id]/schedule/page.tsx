import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconCalendar } from "@/components/icons";
import { ScriptSwitcher } from "@/components/production/script-switcher";
import { slugLabels } from "@/components/production/scene-picker";
import { Stripboard, type BoardDay } from "@/components/production/stripboard";
import { isUuid, loadProjectScenes } from "@/lib/production/load";
import type { StripScene } from "@/lib/production/schedule";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({ params, searchParams }: PageProps<"/projects/[id]/schedule">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const [{ t, locale }, { supabase }] = await Promise.all([getI18n(), getViewer()]);
  const [{ project, scripts, script, scenes }, { data: days }, { data: allScenes }, { data: castEls }, { data: locations }] = await Promise.all([
    loadProjectScenes(supabase, id, sp.script),
    supabase.from("shoot_days").select("*, shoot_day_scenes(scene_id, position)").eq("project_id", id).order("day_number"),
    supabase
      .from("scenes")
      .select("id, scene_number, int_ext, location_name, day_night, page_eighths, synopsis, script:scripts!inner(project_id)")
      .eq("script.project_id", id),
    supabase.from("elements").select("cast_number, scene_elements(scene_id)").eq("project_id", id).eq("category", "cast").not("cast_number", "is", null).order("cast_number"),
    supabase.from("contacts").select("id, full_name").eq("kind", "location").order("full_name"),
  ]);
  if (!project) notFound();

  const sceneMap: Record<string, StripScene> = {};
  for (const sc of allScenes ?? []) {
    const { script: _s, ...rest } = sc;
    void _s;
    sceneMap[sc.id] = rest;
  }
  const boardDays: BoardDay[] = (days ?? []).map(({ shoot_day_scenes, ...d }) => ({
    id: d.id,
    day_number: d.day_number,
    shoot_date: d.shoot_date,
    general_call: d.general_call,
    wrap_time: d.wrap_time,
    location_contact_id: d.location_contact_id,
    sceneIds: [...shoot_day_scenes].sort((a, b) => a.position - b.position).map((x) => x.scene_id),
  }));
  const scheduled = new Set(boardDays.flatMap((d) => d.sceneIds));
  const bank = scenes.filter((sc) => !scheduled.has(sc.id)).map((sc) => sc.id);

  const cast: Record<string, number[]> = {};
  for (const el of castEls ?? []) for (const link of el.scene_elements) (cast[link.scene_id] ??= []).push(el.cast_number!);

  const s = t.schedule;
  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {s.title}
          </>
        }
      />
      <SubToolbar icon={<IconCalendar size={14} />} title={s.title} meta={s.stripboard}>
        {script ? <ScriptSwitcher scripts={scripts} activeId={script.id} hrefFor={(sid) => `/projects/${id}/schedule?script=${sid}`} label={t.breakdown.script} /> : null}
      </SubToolbar>
      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={id} />
        <main className="flex min-w-0 flex-1 flex-col">
          {!script && !boardDays.length ? (
            <div className="p-6">
              <div className="card px-6 py-14 text-center text-muted">
                {t.breakdown.noScripts}{" "}
                <Link href={`/projects/${id}/scripts`} className="font-bold text-accent-ink">
                  {t.projects.script}
                </Link>
              </div>
            </div>
          ) : (
            <Stripboard
              key={`${script?.id ?? ""}:${boardDays.map((d) => d.id).join(",")}`}
              projectId={id}
              scriptId={script?.id ?? null}
              scenes={sceneMap}
              initialDays={boardDays}
              initialBank={bank}
              cast={cast}
              locations={locations ?? []}
              locale={locale}
              t={{ schedule: s, common: t.common, ...slugLabels(locale) }}
            />
          )}
        </main>
      </div>
    </>
  );
}
