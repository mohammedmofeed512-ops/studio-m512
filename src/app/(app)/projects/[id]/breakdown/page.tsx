import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconScript } from "@/components/icons";
import { ScenePicker } from "@/components/production/scene-picker";
import { ScriptSwitcher } from "@/components/production/script-switcher";
import { BreakdownScene } from "@/components/production/breakdown-scene";
import { AutoCastButton } from "@/components/production/auto-cast-button";
import { CATEGORY_COLORS, sceneLines } from "@/lib/production/breakdown";
import { isUuid, loadProjectScenes } from "@/lib/production/load";
import { ELEMENT_CATEGORIES, type ElementCategory } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { getAccess } from "@/lib/access";
import { canEdit, canView } from "@/lib/permissions";
import { EditGate, NoAccessPage, ReadOnlyBanner } from "@/components/access";

export const metadata: Metadata = { title: "Breakdown" };

export default async function BreakdownPage({ params, searchParams }: PageProps<"/projects/[id]/breakdown">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const [{ t, locale }, { supabase }] = await Promise.all([getI18n(), getViewer()]);
  const [{ project, scripts, script, scenes, lines }, access] = await Promise.all([loadProjectScenes(supabase, id, sp.script), getAccess(id)]);
  if (!project || !access) notFound();
  if (!canView(access, "breakdown")) return <NoAccessPage projectId={id} projectName={project.name} title={t.breakdown.title} t={t} />;
  const editable = canEdit(access, "breakdown");

  const b = t.breakdown;
  const view = sp.view === "report" ? "report" : "scenes";
  const base = `/projects/${id}/breakdown`;
  const q = (extra: Record<string, string>) => `${base}?${new URLSearchParams({ ...(script ? { script: script.id } : {}), ...extra })}`;

  const sceneIds = scenes.map((s) => s.id);
  const [{ data: elements }, { data: links }] = await Promise.all([
    supabase.from("elements").select("id, name, category, cast_number").eq("project_id", id).order("cast_number").order("name"),
    sceneIds.length ? supabase.from("scene_elements").select("scene_id, element_id").in("scene_id", sceneIds) : Promise.resolve({ data: [] as Array<{ scene_id: string; element_id: string }> }),
  ]);
  const counts = new Map<string, number>();
  for (const l of links ?? []) counts.set(l.scene_id, (counts.get(l.scene_id) ?? 0) + 1);

  const activeScene = scenes.find((s) => s.id === sp.scene) ?? scenes[0] ?? null;
  const sceneTags = activeScene
    ? (elements ?? [])
        .filter((e) => (links ?? []).some((l) => l.scene_id === activeScene.id && l.element_id === e.id))
        .map((e) => ({ ...e, category: e.category as ElementCategory }))
    : [];

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {b.title}
          </>
        }
      />
      <SubToolbar icon={<IconScript size={14} />} title={b.title} meta={script ? `${script.title} · ${elements?.length ?? 0} ${b.elementsCount}` : undefined}>
        {script ? (
          <>
            <ScriptSwitcher scripts={scripts} activeId={script.id} hrefFor={(sid) => `${base}?script=${sid}`} label={b.script} />
            {editable ? <AutoCastButton projectId={id} scriptId={script.id} label={b.autoCast} hint={b.autoCastHint} /> : null}
            <div role="group" className="flex rounded-md bg-[#F1F2F6] p-0.5">
              <Link href={q({})} aria-current={view === "scenes" ? "page" : undefined} className={`flex h-7 items-center rounded-[5px] px-3 text-[12px] font-bold ${view === "scenes" ? "bg-white shadow-sm" : "text-muted"}`}>
                {t.scripts.scenes}
              </Link>
              <Link href={q({ view: "report" })} aria-current={view === "report" ? "page" : undefined} className={`flex h-7 items-center rounded-[5px] px-3 text-[12px] font-bold ${view === "report" ? "bg-white shadow-sm" : "text-muted"}`}>
                {b.report}
              </Link>
            </div>
          </>
        ) : null}
      </SubToolbar>
      {!editable ? <ReadOnlyBanner t={t} /> : null}

      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={id} />

        {!script ? (
          <main className="flex-1 p-6">
            <div className="card px-6 py-14 text-center text-muted">
              {b.noScripts}{" "}
              <Link href={`/projects/${id}/scripts`} className="font-bold text-accent-ink">
                {t.projects.script}
              </Link>
            </div>
          </main>
        ) : view === "report" ? (
          <main className="min-w-0 flex-1 p-6 max-sm:p-4">
            <section className="card overflow-hidden">
              <div className="overflow-x-auto px-4">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead>
                    <tr>
                      <th className="th w-44">{b.category}</th>
                      <th className="th">{b.name}</th>
                      <th className="th">{b.appearsIn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ELEMENT_CATEGORIES.flatMap((cat) =>
                      (elements ?? [])
                        .filter((e) => e.category === cat)
                        .map((e, i) => {
                          const inScenes = scenes.filter((s) => (links ?? []).some((l) => l.scene_id === s.id && l.element_id === e.id));
                          return (
                            <tr key={e.id}>
                              <td className="td">
                                {i === 0 ? (
                                  <span className="flex items-center gap-2 font-bold">
                                    <span className="size-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[cat] }} />
                                    {t.categories[cat]}
                                  </span>
                                ) : null}
                              </td>
                              <td className="td font-semibold">
                                {e.cast_number ? <span className="me-1.5 text-muted">{e.cast_number}.</span> : null}
                                {e.name}
                              </td>
                              <td className="td">
                                <span className="flex flex-wrap gap-1">
                                  {inScenes.map((s) => (
                                    <Link key={s.id} href={q({ scene: s.id })} className="badge bg-ground text-ink hover:bg-tint">
                                      {s.scene_number}
                                    </Link>
                                  ))}
                                </span>
                              </td>
                            </tr>
                          );
                        }),
                    )}
                  </tbody>
                </table>
                {!elements?.length ? <p className="py-12 text-center text-muted">{b.noElements}</p> : null}
              </div>
            </section>
          </main>
        ) : !activeScene ? (
          <main className="flex-1 p-6">
            <div className="card px-6 py-14 text-center text-muted">{b.noScenes}</div>
          </main>
        ) : (
          <>
            <ScenePicker scenes={scenes} activeId={activeScene.id} hrefFor={(sid) => q({ scene: sid })} counts={counts} countLabel={b.elementsCount} locale={locale} t={t} />
            <main className="min-w-0 flex-1 p-5 max-sm:p-3">
              <EditGate editable={editable}>
              <BreakdownScene
                key={activeScene.id}
                projectId={id}
                sceneId={activeScene.id}
                lines={sceneLines(lines, activeScene.id)}
                language={script.language === "en" ? "en" : "ar"}
                tags={sceneTags}
                t={{ breakdown: t.breakdown, categories: t.categories, common: t.common }}
              />
              </EditGate>
            </main>
          </>
        )}
      </div>
    </>
  );
}
