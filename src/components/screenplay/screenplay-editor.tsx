"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Text from "@tiptap/extension-text";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { saveScriptContent, type SaveResult } from "@/lib/script-actions";
import { ELEMENT_KINDS, extractScenes, formatEighths, type ElementKind, type ScriptLine } from "@/lib/screenplay/model";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ElementNode, ScreenplayDocument, ScreenplayKeys, goToScene, setKind } from "./element-node";
import { ConflictBar, PresenceBadges, usePresence } from "./collab";

type Labels = { scripts: Dictionary["scripts"]; elements: Dictionary["elements"]; placeholders: Dictionary["placeholders"]; presence: Dictionary["presence"] };
type SaveState = "saved" | "dirty" | "saving" | "error";

const AUTOSAVE_MS = 1200;

export function ScreenplayEditor({
  scriptId,
  initialContent,
  language,
  labels,
  readOnly = false,
  baseStamp = null,
  viewerName = "",
}: {
  scriptId: string;
  initialContent: unknown;
  language: "ar" | "en";
  labels: Labels;
  readOnly?: boolean;
  baseStamp?: string | null;
  viewerName?: string;
}) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<unknown>(null);
  // The save stamp this editor last saw; null means "save even if someone else saved".
  const base = useRef<string | null | undefined>(baseStamp ?? undefined);
  const others = usePresence(scriptId, viewerName, !readOnly && Boolean(viewerName));

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      ScreenplayDocument,
      ElementNode,
      Text,
      UndoRedo,
      ScreenplayKeys,
      Placeholder.configure({
        placeholder: ({ node }) => labels.placeholders[(node.attrs.kind as ElementKind) ?? "action"] ?? "",
        emptyNodeClass: "is-empty",
      }),
    ],
    content: initialContent && (initialContent as { content?: unknown[] }).content?.length ? (initialContent as object) : undefined,
    editorProps: {
      attributes: {
        class: "screenplay min-h-[60vh]",
        lang: language,
        dir: language === "ar" ? "rtl" : "ltr",
        spellcheck: "true",
        "aria-label": labels.scripts.title,
      },
    },
    onUpdate: ({ editor }) => {
      pending.current = editor.getJSON();
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
  });

  async function flush() {
    if (!pending.current) return;
    const content = pending.current;
    pending.current = null;
    setSaveState("saving");
    // Sent as a JSON string: ProseMirror builds attrs with Object.create(null), which React
    // cannot pass to a Server Action as plain data (the server would get an opaque reference).
    const result: SaveResult = await saveScriptContent(scriptId, JSON.stringify(content), base.current).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
    if (result.ok) base.current = result.savedAt;
    if (!result.ok && result.conflict) {
      // Keep the edits and wait for the writer to choose; no automatic retry.
      pending.current = pending.current ?? content;
      setConflict(result.conflict.by);
      setSaveState("error");
      setSaveError("");
      return;
    }
    if (pending.current) return; // newer edits arrived; their timer will save them
    setSaveState(result.ok ? "saved" : "error");
    setSaveError(result.ok ? (result.warning ?? "") : result.error);
    if (!result.ok) {
      // Keep the unsaved content and retry shortly.
      pending.current = pending.current ?? content;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 5000);
    }
  }

  // Save on Ctrl/⌘+S and warn before leaving with unsaved edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        void flush();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return { kind: "action" as ElementKind, doc: null };
      const { $from } = editor.state.selection;
      return { kind: ($from.parent.attrs.kind ?? "action") as ElementKind, doc: editor.state.doc };
    },
  });

  // Read lines straight from the ProseMirror nodes; cheap enough to run on every keystroke.
  const doc = state?.doc;
  const scenes = useMemo(() => {
    if (!doc) return [];
    const lines: ScriptLine[] = [];
    doc.forEach((node) => lines.push({ kind: node.attrs.kind as ElementKind, text: node.textContent, sceneId: node.attrs.sceneId }));
    return extractScenes(lines);
  }, [doc]);
  const totalEighths = scenes.reduce((n, s) => n + s.pageEighths, 0);
  const s = labels.scripts;

  const status =
    saveState === "saving" ? s.saving : saveState === "dirty" ? s.unsaved : saveState === "error" ? s.saveFailed : s.saved;

  return (
    <div className="flex min-h-0 flex-1 flex-wrap">
      <div className="min-w-0 flex-[999_1_480px]">
        {conflict !== null ? (
          <ConflictBar
            by={conflict}
            t={labels.presence}
            onReload={() => {
              pending.current = null;
              window.location.reload();
            }}
            onOverwrite={() => {
              setConflict(null);
              base.current = null;
              void flush();
            }}
          />
        ) : null}
        {!readOnly ? (
          <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-white/95 px-6 py-2 backdrop-blur">
            <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
              {s.element}
              <select
                value={state?.kind ?? "action"}
                onChange={(e) => editor && setKind(editor, e.target.value as ElementKind)}
                className="field h-8 w-auto py-0 pe-8 text-[13px]"
              >
                {ELEMENT_KINDS.map((k, i) => (
                  <option key={k} value={k}>
                    {labels.elements[k]} ({i + 1})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-1" role="group" aria-label={s.element}>
              {ELEMENT_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (editor) setKind(editor, k);
                  }}
                  aria-pressed={state?.kind === k}
                  className={`h-8 rounded-md px-2.5 text-[12px] font-bold transition-colors max-lg:hidden ${
                    state?.kind === k ? "bg-tint text-accent-ink" : "text-muted hover:bg-ground hover:text-ink"
                  }`}
                >
                  {labels.elements[k]}
                </button>
              ))}
            </div>
            <PresenceBadges names={others} label={labels.presence.editingNow} />
            <span role="status" aria-live="polite" className={`ms-auto max-w-[50%] truncate text-[12px] font-semibold ${saveState === "error" ? "text-warn" : "text-muted"}`} title={saveError || undefined}>
              {status}
              {saveError ? <span className="font-normal"> · {saveError}</span> : null}
            </span>
          </div>
        ) : null}

        <div className="overflow-x-auto px-6 py-7 max-sm:px-2">
          <div className="sp-page">
            <EditorContent editor={editor} />
          </div>
          {!readOnly ? <p className="no-print mx-auto mt-3 max-w-[8.5in] text-center text-[11px] text-faint">{s.shortcuts}</p> : null}
        </div>
      </div>

      <aside aria-labelledby="scenes-h" className="no-print w-[260px] shrink-0 border-s border-line bg-white max-lg:w-full max-lg:border-s-0 max-lg:border-t">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
          <h2 id="scenes-h" className="text-[15px] font-extrabold">
            {s.scenes}
          </h2>
          <span className="text-[12px] text-muted">
            {scenes.length} · {formatEighths(totalEighths || 0)} {s.pages}
          </span>
        </div>
        <ol className="flex max-h-[calc(100dvh-220px)] flex-col gap-0.5 overflow-y-auto p-2">
          {scenes.length ? (
            scenes.map((scene) => (
              <li key={scene.id}>
                <button
                  type="button"
                  onClick={() => editor && goToScene(editor, scene.id)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-start hover:bg-ground"
                >
                  <span className="mt-0.5 min-w-6 text-[12px] font-extrabold text-accent-ink">{scene.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{scene.location || scene.heading}</span>
                    <span className="block text-[11px] text-muted">{formatEighths(scene.pageEighths)}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-6 text-center text-[12px] leading-relaxed text-muted">{s.noScenes}</li>
          )}
        </ol>
      </aside>
    </div>
  );
}
