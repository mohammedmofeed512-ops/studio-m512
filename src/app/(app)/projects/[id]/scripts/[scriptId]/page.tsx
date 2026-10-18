import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { IconScript } from "@/components/icons";
import { ConfirmButton } from "@/components/confirm-button";
import { ScreenplayEditor } from "@/components/screenplay/screenplay-editor";
import { AvEditor } from "@/components/screenplay/av-editor";
import { createRevision, deleteScript, renameScript, switchVersion } from "@/lib/script-actions";
import { REVISION_COLORS, REVISION_SWATCH, linesToDoc, type RevisionColor } from "@/lib/screenplay/model";
import { emptyAvDoc } from "@/lib/screenplay/av";
import type { Json } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getViewer } from "@/lib/viewer";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: PageProps<"/projects/[id]/scripts/[scriptId]">): Promise<Metadata> {
  const { scriptId } = await params;
  if (!UUID.test(scriptId)) return {};
  const { supabase } = await getViewer();
  const { data } = await supabase.from("scripts").select("title").eq("id", scriptId).maybeSingle();
  return { title: data?.title ?? "Script" };
}

export default async function ScriptPage({ params }: PageProps<"/projects/[id]/scripts/[scriptId]">) {
  const { id, scriptId } = await params;
  if (!UUID.test(id) || !UUID.test(scriptId)) notFound();
  const [{ t, formatDate }, { supabase }] = await Promise.all([getI18n(), getViewer()]);

  const [{ data: script }, { data: project }, { data: versions }] = await Promise.all([
    supabase.from("scripts").select("*").eq("id", scriptId).eq("project_id", id).maybeSingle(),
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("script_versions").select("id, version_number, revision_color, created_at").eq("script_id", scriptId).order("version_number", { ascending: false }),
  ]);
  if (!script || !project) notFound();

  // A script whose first version failed to store gets a fresh blank version, so it can be edited and saved.
  if (!script.current_version_id) {
    const blank = script.kind === "av" ? emptyAvDoc() : linesToDoc([{ kind: "sceneHeading", text: "", sceneId: crypto.randomUUID() }]);
    const { data: repaired } = await supabase
      .from("script_versions")
      .insert({ script_id: script.id, version_number: (versions?.[0]?.version_number ?? 0) + 1, revision_color: "white", content: blank as unknown as Json })
      .select("id")
      .single();
    if (repaired) {
      await supabase.from("scripts").update({ current_version_id: repaired.id }).eq("id", script.id);
      script.current_version_id = repaired.id;
    }
  }

  const { data: current } = await supabase.from("script_versions").select("content, version_number, revision_color").eq("id", script.current_version_id ?? "").maybeSingle();
  const s = t.scripts;
  const color = (current?.revision_color ?? "white") as RevisionColor;
  const language = script.language === "en" ? "en" : "ar";
  const nextColor = REVISION_COLORS[Math.min(REVISION_COLORS.indexOf(color) + 1, REVISION_COLORS.length - 1)];

  return (
    <>
      <div className="no-print">
        <PageHeader
          crumbs={
            <>
              <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
                {project.name}
              </Link>
              <span className="mx-1.5 text-rail-muted">/</span>
              <Link href={`/projects/${id}/scripts`} className="text-muted hover:text-ink">
                {s.title}
              </Link>
              <span className="mx-1.5 text-rail-muted">/</span>
              {script.title}
            </>
          }
        />
      </div>
      <div className="no-print">
        <SubToolbar
          icon={<IconScript size={14} />}
          title={script.title}
          meta={
            <span className="badge border border-field text-ink" style={{ background: REVISION_SWATCH[color] }}>
              {s.version} {current?.version_number ?? 1} · {t.revisionColors[color]}
            </span>
          }
        >
          <details className="relative">
            <summary className="btn-soft h-8 cursor-pointer list-none [&::-webkit-details-marker]:hidden">{s.versions}</summary>
            <div className="absolute end-0 top-10 z-30 w-[300px] rounded-[10px] border border-line bg-white p-3 shadow-lg">
              <form action={createRevision} className="mb-3 flex items-end gap-2 border-b border-line pb-3">
                <input type="hidden" name="script_id" value={script.id} />
                <label className="flex-1">
                  <span className="label">{s.revisionColor}</span>
                  <select name="color" defaultValue={nextColor} className="field h-9">
                    {REVISION_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {t.revisionColors[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn-primary h-9">{s.createRevision}</button>
              </form>
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {(versions ?? []).map((v) => {
                  const isCurrent = v.id === script.current_version_id;
                  return (
                    <li key={v.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-ground">
                      <span className="size-3.5 shrink-0 rounded-sm border border-field" style={{ background: REVISION_SWATCH[v.revision_color as RevisionColor] ?? "#fff" }} />
                      <span className="flex-1">
                        <span className="font-bold">
                          {s.version} {v.version_number}
                        </span>{" "}
                        <span className="text-[11px] text-muted">{formatDate(v.created_at, { day: "numeric", month: "short" })}</span>
                      </span>
                      {isCurrent ? (
                        <span className="badge bg-tint text-accent-ink">{s.current}</span>
                      ) : (
                        <form action={switchVersion}>
                          <input type="hidden" name="script_id" value={script.id} />
                          <input type="hidden" name="version_id" value={v.id} />
                          <button className="btn-ghost h-7 px-2 text-[11px]">{s.switchTo}</button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
          <details className="relative">
            <summary className="btn-ghost h-8 cursor-pointer list-none [&::-webkit-details-marker]:hidden">⋯</summary>
            <div className="absolute end-0 top-10 z-30 w-[280px] rounded-[10px] border border-line bg-white p-3 shadow-lg">
              <form action={renameScript} className="mb-2 flex items-end gap-2">
                <input type="hidden" name="script_id" value={script.id} />
                <label className="flex-1">
                  <span className="label">{s.rename}</span>
                  <input name="title" defaultValue={script.title} maxLength={200} className="field h-9" />
                </label>
                <button className="btn-soft h-9">{t.common.save}</button>
              </form>
              <form action={deleteScript} className="border-t border-line pt-2">
                <input type="hidden" name="script_id" value={script.id} />
                <ConfirmButton className="btn-danger h-8 w-full justify-start" message={s.deleteConfirm}>
                  {s.delete}
                </ConfirmButton>
              </form>
            </div>
          </details>
          <a href={`/print/scripts/${script.id}`} target="_blank" rel="noopener" className="btn-primary h-8">
            {s.exportPdf}
          </a>
        </SubToolbar>
      </div>

      {script.kind === "av" ? (
        <AvEditor key={script.current_version_id} scriptId={script.id} initialContent={current?.content} language={language} t={s} />
      ) : (
        <ScreenplayEditor
          key={script.current_version_id}
          scriptId={script.id}
          initialContent={current?.content}
          language={language}
          labels={{ scripts: s, elements: t.elements, placeholders: dictionaries[language].placeholders }}
        />
      )}
    </>
  );
}
