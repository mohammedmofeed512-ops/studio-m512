"use client";

import { useState } from "react";
import { createScript } from "@/lib/script-actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ScriptLine } from "@/lib/screenplay/model";
import { IconPlus, IconScript } from "@/components/icons";

/** Create a blank screenplay / AV script, or import one from a file. */
export function NewScript({ projectId, t, defaultLanguage }: { projectId: string; t: Dictionary; defaultLanguage: "ar" | "en" }) {
  const s = t.scripts;
  const [lines, setLines] = useState<ScriptLine[] | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStatus("reading");
    setLines(null);
    try {
      const { readScriptFile } = await import("@/lib/screenplay/read-file");
      const parsed = await readScriptFile(file);
      if (!parsed.length) throw new Error("empty");
      setLines(parsed);
      setFileTitle(file.name.replace(/\.[^.]+$/, ""));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const sceneCount = lines?.filter((l) => l.kind === "sceneHeading").length ?? 0;
  const guessLanguage = lines && lines.some((l) => /[؀-ۿ]/.test(l.text)) ? "ar" : lines ? "en" : defaultLanguage;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3 max-sm:grid-cols-1">
      <section aria-labelledby="new-h" className="card overflow-hidden">
        <div className="card-head">
          <div className="flex items-center gap-3">
            <span className="icon-dot">
              <IconPlus size={16} />
            </span>
            <h2 id="new-h" className="card-title">
              {s.newScreenplay}
            </h2>
          </div>
        </div>
        <form action={createScript} onSubmit={() => setBusy(true)} className="flex flex-col gap-4 p-6">
          <input type="hidden" name="project_id" value={projectId} />
          <div>
            <label htmlFor="ns-title" className="label">
              {s.scriptTitle}
            </label>
            <input id="ns-title" name="title" maxLength={200} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ns-kind" className="label">
                {s.kind}
              </label>
              <select id="ns-kind" name="kind" className="field" defaultValue="screenplay">
                <option value="screenplay">{s.screenplay}</option>
                <option value="av">{s.av}</option>
              </select>
            </div>
            <div>
              <label htmlFor="ns-lang" className="label">
                {s.language}
              </label>
              <select id="ns-lang" name="language" className="field" defaultValue={defaultLanguage}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <button className="btn-primary self-start" disabled={busy}>
            + {t.common.add}
          </button>
        </form>
      </section>

      <section aria-labelledby="import-h" className="card overflow-hidden">
        <div className="card-head">
          <div className="flex items-center gap-3">
            <span className="icon-dot">
              <IconScript size={16} />
            </span>
            <h2 id="import-h" className="card-title">
              {s.import}
            </h2>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed border-field px-4 py-7 text-center hover:border-accent hover:bg-tint/40">
            <span className="font-bold text-accent-ink">{s.import}</span>
            <span className="text-[12px] text-muted">{s.importHint}</span>
            <input
              type="file"
              accept=".docx,.pdf,.fdx,.fountain,.spmd,.txt"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
          <p role="status" aria-live="polite" className={`text-[12px] ${status === "error" ? "text-warn" : "text-muted"}`}>
            {status === "reading" ? s.importing : status === "error" ? s.importFailed : ""}
          </p>

          {lines ? (
            <form action={createScript} onSubmit={() => setBusy(true)} className="flex flex-col gap-3">
              <p className="rounded-md bg-ok-tint px-3 py-2.5 text-[12px] leading-relaxed text-ok">
                {s.importPreview.replace("{scenes}", String(sceneCount)).replace("{lines}", String(lines.length))}
              </p>
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="kind" value="screenplay" />
              <input type="hidden" name="language" value={guessLanguage} />
              <input type="hidden" name="lines" value={JSON.stringify(lines)} />
              <div>
                <label htmlFor="imp-title" className="label">
                  {s.scriptTitle}
                </label>
                <input id="imp-title" name="title" defaultValue={fileTitle} maxLength={200} className="field" />
              </div>
              <button className="btn-primary self-start" disabled={busy}>
                {s.importCreate}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
