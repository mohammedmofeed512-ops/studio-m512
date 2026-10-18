"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLookbookItems, deleteLookbookItem, updateLookbookItem } from "@/lib/production-actions";
import { uploadImage } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Item = { id: string; category: string | null; note: string | null; url: string | null };

export function LookbookBoard({ projectId, userId, items, t }: { projectId: string; userId: string; items: Item[]; t: Pick<Dictionary, "lookbook" | "shots" | "common"> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [group, setGroup] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const l = t.lookbook;

  const groups = useMemo(() => [...new Set(items.map((i) => i.category ?? ""))].sort((a, b) => (a ? (b ? a.localeCompare(b) : -1) : 1)), [items]);
  const shown = filter === null ? items : items.filter((i) => (i.category ?? "") === filter);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setStatus(t.shots.uploading);
    const paths: string[] = [];
    let failed = false;
    for (const file of Array.from(files).slice(0, 30)) {
      const res = await uploadImage(file, userId, `${projectId}/lookbook`);
      if (res.ok) paths.push(res.path);
      else failed = true;
    }
    if (paths.length) await addLookbookItems({ projectId, paths, category: group });
    setStatus(failed ? t.shots.uploadFailed : "");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={l.upload} className="card flex flex-wrap items-end gap-3 px-5 py-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="lb-group" className="label">
            {l.category}
          </label>
          <input id="lb-group" value={group} onChange={(e) => setGroup(e.target.value)} list="lb-groups" maxLength={80} placeholder={l.categoryPlaceholder} className="field" />
          <datalist id="lb-groups">
            {groups.filter(Boolean).map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <label className="btn-primary h-10 cursor-pointer">
          + {l.upload}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
        </label>
        <span role="status" aria-live="polite" className="text-[12px] text-muted">
          {status}
        </span>
      </section>

      {groups.length > 1 || (groups.length === 1 && groups[0]) ? (
        <div role="tablist" className="flex flex-wrap gap-1.5">
          <button type="button" role="tab" aria-selected={filter === null} onClick={() => setFilter(null)} className={`h-8 rounded-full px-3.5 text-[12px] font-bold ${filter === null ? "bg-tint text-accent-ink" : "bg-white text-muted"}`}>
            {l.all} · {items.length}
          </button>
          {groups.map((g) => (
            <button key={g || "none"} type="button" role="tab" aria-selected={filter === g} onClick={() => setFilter(g)} className={`h-8 rounded-full px-3.5 text-[12px] font-bold ${filter === g ? "bg-tint text-accent-ink" : "bg-white text-muted"}`}>
              {g || l.uncategorized} · {items.filter((i) => (i.category ?? "") === g).length}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length ? (
        <section className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {shown.map((item) => (
            <figure key={item.id} className="card m-0 overflow-hidden">
              <div className="aspect-[4/3] bg-[#E4E6EE]">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.note ?? item.category ?? ""} className="size-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <figcaption className="flex flex-col gap-1.5 p-3">
                {item.category ? <span className="badge self-start bg-ground text-body">{item.category}</span> : null}
                <label>
                  <span className="sr-only">{l.note}</span>
                  <textarea
                    defaultValue={item.note ?? ""}
                    placeholder={l.note}
                    rows={2}
                    onBlur={(e) => {
                      if (e.target.value !== (item.note ?? "")) void updateLookbookItem({ projectId, itemId: item.id, note: e.target.value });
                    }}
                    className="w-full resize-none rounded-md border border-transparent px-1.5 py-1 text-[12.5px] leading-relaxed hover:border-line focus:border-field focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    confirm(l.deleteConfirm) &&
                    start(async () => {
                      await deleteLookbookItem({ projectId, itemId: item.id });
                      router.refresh();
                    })
                  }
                  className="btn-ghost h-7 self-end px-2 text-[11px]"
                >
                  {t.common.delete}
                </button>
              </figcaption>
            </figure>
          ))}
        </section>
      ) : (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <h2 className="text-[18px] font-extrabold">{l.empty}</h2>
          <p className="mt-1 max-w-[460px] leading-relaxed text-body">{l.emptyHint}</p>
        </div>
      )}
    </div>
  );
}
