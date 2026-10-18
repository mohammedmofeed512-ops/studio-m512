import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconScript } from "@/components/icons";
import { NewScript } from "@/components/screenplay/new-script";
import { REVISION_SWATCH, formatEighths, type RevisionColor } from "@/lib/screenplay/model";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Scripts" };

export default async function ScriptsPage({ params }: PageProps<"/projects/[id]/scripts">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ t, locale, formatDate }, { supabase }] = await Promise.all([getI18n(), getViewer()]);

  const [{ data: project }, { data: scripts }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("scripts")
      .select("id, title, kind, language, updated_at, current_version_id, version:script_versions!scripts_current_version_fk(version_number, revision_color), scenes(page_eighths)")
      .eq("project_id", id)
      .order("updated_at", { ascending: false }),
  ]);
  if (!project) notFound();
  const s = t.scripts;

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href="/projects" className="text-muted hover:text-ink">
              {t.projects.title}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {s.title}
          </>
        }
      />
      <SubToolbar icon={<IconScript size={14} />} title={s.title} meta={`${scripts?.length ?? 0}`} />

      <div className="flex flex-1 flex-wrap">
        <ProjectSidebar projectId={id} active="script" t={t} />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-6 max-sm:p-4">
          {scripts?.length ? (
            <section aria-label={s.title} className="card overflow-hidden">
              {scripts.map((sc) => {
                const version = sc.version as { version_number: number; revision_color: string } | null;
                const eighths = ((sc.scenes as { page_eighths: number }[]) ?? []).reduce((n, x) => n + x.page_eighths, 0);
                const sceneCount = (sc.scenes as unknown[])?.length ?? 0;
                const color = (version?.revision_color ?? "white") as RevisionColor;
                return (
                  <Link key={sc.id} href={`/projects/${id}/scripts/${sc.id}`} className="flex items-center gap-4 border-b border-line px-6 py-4 last:border-b-0 hover:bg-ground/60">
                    <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded border border-field text-accent" style={{ background: REVISION_SWATCH[color] }}>
                      <IconScript size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold">{sc.title}</span>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {sc.kind === "av" ? s.av : s.screenplay} · {sc.language === "ar" ? "العربية" : "English"}
                        {sc.kind === "screenplay" ? ` · ${sceneCount} ${s.scenes} · ${formatEighths(eighths)} ${s.pages}` : ""}
                      </span>
                    </span>
                    <span className="text-end text-[12px] text-muted">
                      {s.version} {version?.version_number ?? 1} · {t.revisionColors[color]}
                      <br />
                      {s.updated}: {formatDate(sc.updated_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </Link>
                );
              })}
            </section>
          ) : (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <span className="flex size-[72px] items-center justify-center rounded-full bg-tint text-accent">
                <IconScript size={30} />
              </span>
              <h2 className="mt-4 text-[20px] font-extrabold">{s.empty}</h2>
              <p className="mt-1 text-body">{s.emptyHint}</p>
            </div>
          )}
          <NewScript projectId={id} t={t} defaultLanguage={locale} />
        </main>
      </div>
    </>
  );
}
