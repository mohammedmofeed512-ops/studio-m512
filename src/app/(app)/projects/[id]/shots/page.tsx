import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconScript } from "@/components/icons";
import { ScenePicker, sceneSlug } from "@/components/production/scene-picker";
import { ScriptSwitcher } from "@/components/production/script-switcher";
import { ShotBoard } from "@/components/production/shot-board";
import { isUuid, loadProjectScenes } from "@/lib/production/load";
import { signMedia } from "@/lib/supabase/media";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Shots" };

export default async function ShotsPage({ params, searchParams }: PageProps<"/projects/[id]/shots">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const [{ t, locale }, { supabase, userId }] = await Promise.all([getI18n(), getViewer()]);
  const { project, scripts, script, scenes } = await loadProjectScenes(supabase, id, sp.script);
  if (!project) notFound();

  const s = t.shots;
  const view = sp.view === "list" ? "list" : "storyboard";
  const base = `/projects/${id}/shots`;
  const activeScene = scenes.find((x) => x.id === sp.scene) ?? scenes[0] ?? null;
  const q = (extra: Record<string, string>) =>
    `${base}?${new URLSearchParams({ ...(script ? { script: script.id } : {}), ...(activeScene ? { scene: activeScene.id } : {}), view, ...extra })}`;

  const sceneIds = scenes.map((x) => x.id);
  const { data: allShots } = sceneIds.length
    ? await supabase.from("shots").select("*").in("scene_id", sceneIds).order("position")
    : { data: [] };
  const counts = new Map<string, number>();
  for (const sh of allShots ?? []) counts.set(sh.scene_id, (counts.get(sh.scene_id) ?? 0) + 1);

  const sceneShots = (allShots ?? []).filter((sh) => sh.scene_id === activeScene?.id);
  const urls = await signMedia(supabase, sceneShots.map((sh) => sh.image_path));

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
      <SubToolbar
        icon={<IconScript size={14} />}
        title={s.title}
        meta={activeScene ? `${t.breakdown.sceneOf} ${activeScene.scene_number} · ${activeScene.location_name ?? ""} · ${sceneSlug(activeScene, locale)}` : undefined}
      >
        {script ? (
          <>
            <ScriptSwitcher scripts={scripts} activeId={script.id} hrefFor={(sid) => `${base}?script=${sid}`} label={t.breakdown.script} />
            <div role="group" className="flex rounded-md bg-[#F1F2F6] p-0.5">
              <Link href={q({ view: "storyboard" })} aria-current={view === "storyboard" ? "page" : undefined} className={`flex h-7 items-center rounded-[5px] px-3 text-[12px] font-bold ${view === "storyboard" ? "bg-white shadow-sm" : "text-muted"}`}>
                {s.storyboard}
              </Link>
              <Link href={q({ view: "list" })} aria-current={view === "list" ? "page" : undefined} className={`flex h-7 items-center rounded-[5px] px-3 text-[12px] font-bold ${view === "list" ? "bg-white shadow-sm" : "text-muted"}`}>
                {s.list}
              </Link>
            </div>
          </>
        ) : null}
      </SubToolbar>

      <div className="flex flex-1 flex-wrap">
        <ProjectSidebar projectId={id} active="shots" t={t} />
        {!script ? (
          <main className="flex-1 p-6">
            <div className="card px-6 py-14 text-center text-muted">
              {t.breakdown.noScripts}{" "}
              <Link href={`/projects/${id}/scripts`} className="font-bold text-accent-ink">
                {t.projects.script}
              </Link>
            </div>
          </main>
        ) : !activeScene ? (
          <main className="flex-1 p-6">
            <div className="card px-6 py-14 text-center text-muted">{t.breakdown.noScenes}</div>
          </main>
        ) : (
          <>
            <ScenePicker scenes={scenes} activeId={activeScene.id} hrefFor={(sid) => q({ scene: sid })} counts={counts} countLabel={s.shotsCount} locale={locale} t={t} />
            <main className="min-w-0 flex-1 p-5 max-sm:p-3">
              <ShotBoard
                key={activeScene.id}
                projectId={id}
                sceneId={activeScene.id}
                userId={userId}
                view={view}
                initialShots={sceneShots.map((sh) => ({ ...sh, imageUrl: sh.image_path ? (urls.get(sh.image_path) ?? null) : null }))}
                t={{ shots: s, shotSizes: t.shotSizes, shotAngles: t.shotAngles, shotMovements: t.shotMovements, common: t.common }}
              />
            </main>
          </>
        )}
      </div>
    </>
  );
}
