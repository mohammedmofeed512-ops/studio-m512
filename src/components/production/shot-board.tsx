"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addShot, deleteShot, moveShot, setShotImage, updateShot } from "@/lib/production-actions";
import { uploadImage } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Shot } from "@/lib/database.types";
import { formatDuration } from "@/lib/screenplay/av";

type ShotView = Shot & { imageUrl: string | null };
type Labels = Pick<Dictionary, "shots" | "shotSizes" | "shotAngles" | "shotMovements" | "common">;

export function ShotBoard({
  projectId,
  sceneId,
  userId,
  initialShots,
  view,
  t,
}: {
  projectId: string;
  sceneId: string;
  userId: string;
  initialShots: ShotView[];
  view: "list" | "storyboard";
  t: Labels;
}) {
  const router = useRouter();
  const [shots, setShots] = useState(initialShots);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const s = t.shots;

  useEffect(() => setShots(initialShots), [initialShots]);

  function edit(id: string, field: keyof Shot, value: string | number | null) {
    setShots((list) => list.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
    const key = `${id}:${field}`;
    const prev = timers.current.get(key);
    if (prev) clearTimeout(prev);
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        void updateShot({ projectId, shotId: id, fields: { [field]: value } });
      }, 600),
    );
  }

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  async function onImage(shotId: string, file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(shotId);
    const res = await uploadImage(file, userId, `${projectId}/shots`);
    if (!res.ok) {
      setError(res.reason === "tooLarge" ? s.tooLarge : res.reason === "storageFull" ? s.storageFull : s.uploadFailed);
      setUploading(null);
      return;
    }
    await setShotImage({ projectId, shotId, path: res.path });
    setUploading(null);
    router.refresh();
  }

  const total = shots.reduce((n, x) => n + (x.duration_seconds ?? 0), 0);

  const select = (id: string, field: "size" | "angle" | "movement", value: string | null, options: Record<string, string>, label: string) => (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select value={value ?? ""} onChange={(e) => edit(id, field, e.target.value || null)} className="field h-8 px-2 text-[12.5px]">
        <option value="">{s.choose}</option>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );

  const imageInput = (shot: ShotView, label: string, className: string) => (
    <label className={className}>
      {uploading === shot.id ? s.uploading : label}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => void onImage(shot.id, e.target.files?.[0])} />
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary h-8" disabled={pending} onClick={() => run(() => addShot({ projectId, sceneId }))}>
          {s.add}
        </button>
        <span className="text-[12px] text-muted">
          {shots.length} {s.shotsCount} · {s.total}: {formatDuration(total)}
        </span>
        {error ? (
          <span role="alert" className="text-[12px] font-semibold text-warn">
            {error}
          </span>
        ) : null}
      </div>

      {!shots.length ? (
        <div className="card px-6 py-14 text-center text-muted">{s.empty}</div>
      ) : view === "storyboard" ? (
        <section aria-label={s.storyboard} className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {shots.map((shot, i) => (
            <article key={shot.id} className="card overflow-hidden">
              <div className="relative aspect-video bg-[#E4E6EE]">
                {shot.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.imageUrl} alt={shot.description ?? shot.shot_number} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[12px] text-body">{s.noPicture}</span>
                )}
                <span className="absolute start-2 top-2 rounded bg-rail px-2 py-0.5 text-[11px] font-bold text-white">{shot.shot_number}</span>
                {imageInput(shot, shot.imageUrl ? s.replace : s.upload, "absolute bottom-2 end-2 cursor-pointer rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-bold text-accent-ink shadow-sm hover:bg-white")}
              </div>
              <div className="flex flex-col gap-2 p-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {select(shot.id, "size", shot.size, t.shotSizes, s.size)}
                  {select(shot.id, "angle", shot.angle, t.shotAngles, s.angle)}
                  {select(shot.id, "movement", shot.movement, t.shotMovements, s.movement)}
                </div>
                <label>
                  <span className="sr-only">{s.description}</span>
                  <textarea
                    value={shot.description ?? ""}
                    onChange={(e) => edit(shot.id, "description", e.target.value)}
                    placeholder={s.descriptionPlaceholder}
                    rows={2}
                    className="w-full resize-none rounded-md border border-transparent px-1.5 py-1 text-[13px] leading-relaxed hover:border-line focus:border-field focus:outline-none"
                  />
                </label>
                <div className="flex items-center gap-2 text-[12px] text-muted">
                  <input aria-label={s.lens} dir="ltr" value={shot.lens ?? ""} onChange={(e) => edit(shot.id, "lens", e.target.value)} placeholder="35mm" className="field h-7 w-20 px-2 text-[12px]" />
                  <input
                    aria-label={s.duration}
                    type="number"
                    min={0}
                    value={shot.duration_seconds ?? ""}
                    onChange={(e) => edit(shot.id, "duration_seconds", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={s.duration}
                    className="field h-7 w-20 px-2 text-[12px]"
                  />
                  <span className="ms-auto flex">
                    <button type="button" aria-label="▲" disabled={i === 0} onClick={() => run(() => moveShot({ projectId, sceneId, shotId: shot.id, direction: -1 }))} className="btn-ghost h-7 px-1.5">
                      ‹
                    </button>
                    <button type="button" aria-label="▼" disabled={i === shots.length - 1} onClick={() => run(() => moveShot({ projectId, sceneId, shotId: shot.id, direction: 1 }))} className="btn-ghost h-7 px-1.5">
                      ›
                    </button>
                    <button type="button" onClick={() => confirm(s.deleteConfirm) && run(() => deleteShot({ projectId, shotId: shot.id }))} className="btn-ghost h-7 px-2 text-[11px]">
                      {t.common.delete}
                    </button>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section aria-label={s.list} className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className="th ps-5">{s.number}</th>
                  <th className="th w-16">{s.image}</th>
                  <th className="th">{s.size}</th>
                  <th className="th">{s.angle}</th>
                  <th className="th">{s.movement}</th>
                  <th className="th w-24">{s.lens}</th>
                  <th className="th w-20">{s.duration}</th>
                  <th className="th">{s.description}</th>
                  <th className="th">
                    <span className="sr-only">{t.common.delete}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shots.map((shot, i) => (
                  <tr key={shot.id} className="align-top">
                    <td className="td ps-5">
                      <input aria-label={s.number} value={shot.shot_number} onChange={(e) => edit(shot.id, "shot_number", e.target.value)} className="field h-8 w-16 px-2 font-bold" />
                    </td>
                    <td className="td">
                      {shot.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shot.imageUrl} alt="" className="h-9 w-16 rounded object-cover" />
                      ) : (
                        imageInput(shot, "+", "flex h-9 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-field text-muted hover:border-accent hover:text-accent")
                      )}
                    </td>
                    <td className="td">{select(shot.id, "size", shot.size, t.shotSizes, s.size)}</td>
                    <td className="td">{select(shot.id, "angle", shot.angle, t.shotAngles, s.angle)}</td>
                    <td className="td">{select(shot.id, "movement", shot.movement, t.shotMovements, s.movement)}</td>
                    <td className="td">
                      <input aria-label={s.lens} dir="ltr" value={shot.lens ?? ""} onChange={(e) => edit(shot.id, "lens", e.target.value)} placeholder="35mm" className="field h-8 px-2" />
                    </td>
                    <td className="td">
                      <input
                        aria-label={s.duration}
                        type="number"
                        min={0}
                        value={shot.duration_seconds ?? ""}
                        onChange={(e) => edit(shot.id, "duration_seconds", e.target.value === "" ? null : Number(e.target.value))}
                        className="field h-8 px-2"
                      />
                    </td>
                    <td className="td">
                      <textarea
                        aria-label={s.description}
                        value={shot.description ?? ""}
                        onChange={(e) => edit(shot.id, "description", e.target.value)}
                        placeholder={s.descriptionPlaceholder}
                        rows={1}
                        className="field h-auto min-h-8 resize-y px-2 py-1.5 leading-relaxed"
                      />
                    </td>
                    <td className="td whitespace-nowrap">
                      <button type="button" aria-label="▲" disabled={i === 0} onClick={() => run(() => moveShot({ projectId, sceneId, shotId: shot.id, direction: -1 }))} className="btn-ghost h-7 px-1.5">
                        ▲
                      </button>
                      <button type="button" aria-label="▼" disabled={i === shots.length - 1} onClick={() => run(() => moveShot({ projectId, sceneId, shotId: shot.id, direction: 1 }))} className="btn-ghost h-7 px-1.5">
                        ▼
                      </button>
                      <button type="button" onClick={() => confirm(s.deleteConfirm) && run(() => deleteShot({ projectId, shotId: shot.id }))} className="btn-ghost h-7 px-2 text-[11px]">
                        {t.common.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
