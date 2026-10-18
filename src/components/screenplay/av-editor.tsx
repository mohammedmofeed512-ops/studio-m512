"use client";

import { useEffect, useRef, useState } from "react";
import { saveScriptContent } from "@/lib/script-actions";
import { estimateSeconds, formatDuration, newRowId, rowSeconds, sanitizeAvDoc, timecodes, totalSeconds, type AvRow } from "@/lib/screenplay/av";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type SaveState = "saved" | "dirty" | "saving" | "error";

export function AvEditor({ scriptId, initialContent, language, t }: { scriptId: string; initialContent: unknown; language: "ar" | "en"; t: Dictionary["scripts"] }) {
  const [rows, setRows] = useState<AvRow[]>(() => {
    const doc = sanitizeAvDoc(initialContent);
    return doc.rows.length ? doc.rows : [{ id: newRowId(), video: "", audio: "", seconds: null }];
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const latest = useRef(rows);

  async function flush() {
    if (!dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    const result = await saveScriptContent(scriptId, { type: "av", rows: latest.current }).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
    if (dirty.current) return;
    setSaveState(result.ok ? "saved" : "error");
    setSaveError(result.ok ? "" : result.error);
    if (!result.ok) {
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 5000);
    }
  }

  function update(next: AvRow[]) {
    setRows(next);
    latest.current = next;
    dirty.current = true;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1000);
  }

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const patch = (id: string, change: Partial<AvRow>) => update(rows.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  const total = totalSeconds(rows);
  const codes = timecodes(rows);
  const status = saveState === "saving" ? t.saving : saveState === "dirty" ? t.unsaved : saveState === "error" ? t.saveFailed : t.saved;
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <div className="flex-1 px-6 py-6 max-sm:px-3">
      <div className="no-print mb-3 flex flex-wrap items-center gap-3">
        <span className="badge bg-tint text-accent-ink">
          {t.avTotal}: {formatDuration(total)}
        </span>
        <span className="text-[12px] text-muted">{rows.length} ·</span>
        <span role="status" aria-live="polite" className={`ms-auto max-w-[60%] truncate text-[12px] font-semibold ${saveState === "error" ? "text-warn" : "text-muted"}`} title={saveError || undefined}>
          {status}
          {saveError ? <span className="font-normal"> · {saveError}</span> : null}
        </span>
      </div>

      <div dir={dir} lang={language} className="print-page card overflow-hidden">
        <div className="grid grid-cols-[44px_104px_1fr_1fr_96px] border-b border-line bg-ground/60 text-[11px] font-bold text-faint max-md:hidden">
          <span className="px-3 py-3">#</span>
          <span className="px-3 py-3">{t.avTimecode}</span>
          <span className="px-3 py-3">{t.avVideo}</span>
          <span className="px-3 py-3">{t.avAudio}</span>
          <span className="px-3 py-3">{t.avSeconds}</span>
        </div>
        {rows.map((row, i) => {
          const estimated = row.seconds == null;
          const tc = codes[i];
          return (
            <div key={row.id} className="av-row grid grid-cols-[44px_104px_1fr_1fr_96px] items-start border-b border-line last:border-b-0 max-md:grid-cols-1">
              <div className="flex flex-col items-center gap-1 px-2 pt-3 max-md:flex-row max-md:px-4">
                <span className="text-[13px] font-extrabold text-accent-ink">{i + 1}</span>
                <span className="no-print flex flex-col max-md:flex-row">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t.avMoveUp} className="btn-ghost h-6 px-1.5 text-[11px]">
                    ▲
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={t.avMoveDown} className="btn-ghost h-6 px-1.5 text-[11px]">
                    ▼
                  </button>
                </span>
              </div>
              <div className="px-3 pt-3.5 max-md:px-4 max-md:pt-0" aria-label={`${t.avTimecode} ${i + 1}`}>
                <span dir="ltr" className="block whitespace-nowrap font-mono text-[12.5px] font-bold text-ink">
                  {formatDuration(tc.start)} – {formatDuration(tc.end)}
                </span>
              </div>
              <label className="block p-2">
                <span className="sr-only">{t.avVideo} {i + 1}</span>
                <textarea
                  value={row.video}
                  onChange={(e) => patch(row.id, { video: e.target.value })}
                  placeholder={t.avVideoPlaceholder}
                  rows={3}
                  className="av-cell w-full rounded-md border border-transparent bg-transparent px-2.5 py-2 text-[13px] focus:border-field focus:bg-white focus:outline-none"
                />
              </label>
              <label className="block border-s border-line p-2 max-md:border-s-0">
                <span className="sr-only">{t.avAudio} {i + 1}</span>
                <textarea
                  value={row.audio}
                  onChange={(e) => patch(row.id, { audio: e.target.value })}
                  placeholder={t.avAudioPlaceholder}
                  rows={3}
                  className="av-cell w-full rounded-md border border-transparent bg-transparent px-2.5 py-2 text-[13px] focus:border-field focus:bg-white focus:outline-none"
                />
              </label>
              <div className="flex flex-col gap-1 p-2">
                <label>
                  <span className="sr-only">{t.avSeconds} {i + 1}</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={row.seconds ?? ""}
                    placeholder={String(estimateSeconds(row.audio))}
                    onChange={(e) => patch(row.id, { seconds: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                    className="field h-9 text-center"
                  />
                </label>
                <span className="text-center text-[10.5px] text-faint">{estimated ? `${rowSeconds(row)} · ${t.avEstimated}` : formatDuration(rowSeconds(row))}</span>
                <button
                  type="button"
                  onClick={() => update(rows.length > 1 ? rows.filter((r) => r.id !== row.id) : [{ id: newRowId(), video: "", audio: "", seconds: null }])}
                  className="no-print btn-ghost h-7 px-2 text-[11px]"
                >
                  {t.avRemoveRow}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => update([...rows, { id: newRowId(), video: "", audio: "", seconds: null }])} className="no-print btn-soft mt-3">
        {t.avAddRow}
      </button>
    </div>
  );
}
