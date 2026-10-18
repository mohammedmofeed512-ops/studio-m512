"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tagElement, untagElement } from "@/lib/production-actions";
import { CATEGORY_COLORS, segmentText } from "@/lib/production/breakdown";
import { ELEMENT_CATEGORIES, type ElementCategory } from "@/lib/database.types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ScriptLine } from "@/lib/screenplay/model";

type Tag = { id: string; name: string; category: ElementCategory; cast_number: number | null };

/** Scene text with tagged words highlighted; selecting text offers the categories to tag it with. */
export function BreakdownScene({
  projectId,
  sceneId,
  lines,
  language,
  tags,
  t,
}: {
  projectId: string;
  sceneId: string;
  lines: ScriptLine[];
  language: "ar" | "en";
  tags: Tag[];
  t: Pick<Dictionary, "breakdown" | "categories" | "common">;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [manual, setManual] = useState({ name: "", category: "props" as ElementCategory });
  const b = t.breakdown;

  function onMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (!sel || !text || text.length > 120 || !boxRef.current || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!boxRef.current.contains(range.commonAncestorContainer)) return;
    const r = range.getBoundingClientRect();
    const box = boxRef.current.getBoundingClientRect();
    setSelection({ text, x: r.left + r.width / 2 - box.left, y: r.bottom - box.top + 8 });
  }

  function tag(name: string, category: ElementCategory) {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    start(async () => {
      await tagElement({ projectId, sceneId, category, name });
      router.refresh();
    });
  }

  function untag(elementId: string) {
    start(async () => {
      await untagElement({ projectId, sceneId, elementId });
      router.refresh();
    });
  }

  const byCategory = ELEMENT_CATEGORIES.map((c) => ({ category: c, items: tags.filter((x) => x.category === c) })).filter((g) => g.items.length);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-3 max-xl:grid-cols-1">
      <section aria-labelledby="scene-text-h" className="card overflow-hidden">
        <div className="card-head">
          <h2 id="scene-text-h" className="card-title">
            {b.sceneText}
          </h2>
          {pending ? <span className="text-[12px] text-muted">…</span> : null}
        </div>
        <p className="border-b border-line bg-tint/50 px-6 py-2.5 text-[12px] text-accent-strong">{b.selectHint}</p>
        <div ref={boxRef} onMouseUp={onMouseUp} onKeyUp={onMouseUp} className="relative px-10 py-8 max-sm:px-5">
          <div className="screenplay mx-auto max-w-[620px] select-text" lang={language} dir={language === "ar" ? "rtl" : "ltr"}>
            {lines.map((line, i) => (
              <p key={i} className="sp-el" data-kind={line.kind}>
                {segmentText(line.text, tags).map((seg, j) =>
                  seg.category ? (
                    <mark key={j} title={t.categories[seg.category]} className="rounded-[3px] px-0.5 text-inherit" style={{ background: CATEGORY_COLORS[seg.category] }}>
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={j}>{seg.text}</span>
                  ),
                )}
              </p>
            ))}
          </div>

          {selection ? (
            <div
              role="dialog"
              aria-label={`${b.tagAs}: ${selection.text}`}
              className="absolute z-20 w-[280px] -translate-x-1/2 rounded-[10px] border border-line bg-white p-2.5 shadow-lg"
              style={{ left: Math.max(150, selection.x), top: selection.y }}
            >
              <div className="mb-2 truncate px-1 text-[12px] font-bold">
                {b.tagAs} «{selection.text}»
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ELEMENT_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => tag(selection.text, c)}
                    className="rounded-full px-2.5 py-1 text-[11.5px] font-bold text-ink hover:ring-2 hover:ring-accent/40"
                    style={{ background: CATEGORY_COLORS[c] }}
                  >
                    {t.categories[c]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <aside aria-labelledby="elements-h" className="card overflow-hidden">
        <div className="card-head">
          <h2 id="elements-h" className="card-title">
            {b.elements}
          </h2>
          <span className="badge bg-tint text-accent-ink">{tags.length}</span>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {byCategory.length ? (
            byCategory.map(({ category, items }) => (
              <div key={category}>
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-muted">
                  <span className="size-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[category] }} />
                  {t.categories[category]}
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {items.map((el) => (
                    <li key={el.id} className="flex items-center gap-1 rounded-full border border-line py-0.5 ps-2.5 pe-1 text-[12.5px] font-semibold">
                      {el.cast_number ? <span className="text-[11px] text-muted">{el.cast_number}.</span> : null}
                      {el.name}
                      <button type="button" onClick={() => untag(el.id)} aria-label={`${b.remove} ${el.name}`} className="flex size-5 items-center justify-center rounded-full text-muted hover:bg-warn-tint hover:text-warn">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-[12px] leading-relaxed text-muted">{b.noElements}</p>
          )}
        </div>
        <form
          className="flex flex-col gap-2 border-t border-line px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!manual.name.trim()) return;
            tag(manual.name, manual.category);
            setManual({ ...manual, name: "" });
          }}
        >
          <span className="label mb-0">{b.addManually}</span>
          <label className="sr-only" htmlFor="el-name">
            {b.name}
          </label>
          <input id="el-name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} maxLength={160} placeholder={b.name} className="field h-9" />
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="el-cat">
              {b.category}
            </label>
            <select id="el-cat" value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value as ElementCategory })} className="field h-9">
              {ELEMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.categories[c]}
                </option>
              ))}
            </select>
            <button className="btn-soft h-9" disabled={pending}>
              {t.common.add}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
