"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatEighths } from "@/lib/screenplay/model";
import { moveScene, stripColor, sumEighths, type Layout, type StripScene } from "@/lib/production/schedule";
import { addShootDay, autoSchedule, deleteShootDay, saveStripboard, updateShootDay } from "@/lib/schedule-actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type BoardDay = {
  id: string;
  day_number: number;
  shoot_date: string | null;
  general_call: string | null;
  wrap_time: string | null;
  location_contact_id: string | null;
  sceneIds: string[];
};

type Labels = Pick<Dictionary, "schedule" | "common"> & { intExt: Record<string, string>; dayNight: Record<string, string> };
type SaveState = "saved" | "dirty" | "saving" | "error";

export function Stripboard({
  projectId,
  scriptId,
  scenes,
  initialDays,
  initialBank,
  cast,
  locations,
  locale,
  readOnly = false,
  showCallSheets = true,
  t,
}: {
  projectId: string;
  scriptId: string | null;
  scenes: Record<string, StripScene>;
  initialDays: BoardDay[];
  initialBank: string[];
  cast: Record<string, number[]>;
  locations: Array<{ id: string; full_name: string }>;
  locale: string;
  readOnly?: boolean;
  showCallSheets?: boolean;
  t: Labels;
}) {
  const s = t.schedule;
  const [days, setDays] = useState(initialDays);
  const [bank, setBank] = useState(initialBank);
  const [save, setSave] = useState<SaveState>("saved");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ day: string | null; index: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pagesPerDay, setPagesPerDay] = useState(5);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const latest = useRef(days);
  useEffect(() => {
    latest.current = days;
  }, [days]);

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.full_name;

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    if (!dirty.current) return true;
    dirty.current = false;
    setSave("saving");
    const layout = latest.current.map((d) => ({ id: d.id, sceneIds: d.sceneIds }));
    const res = await saveStripboard(projectId, JSON.stringify(layout)).catch(() => ({ ok: false as const }));
    if (dirty.current) return res.ok; // newer moves will save themselves
    setSave(res.ok ? "saved" : "error");
    if (!res.ok) {
      dirty.current = true;
      timer.current = setTimeout(flush, 4000);
    }
    return res.ok;
  }

  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);

  function apply(next: Layout) {
    setDays((prev) => prev.map((d) => ({ ...d, sceneIds: next.days.find((x) => x.id === d.id)?.sceneIds ?? d.sceneIds })));
    setBank(next.bank);
    dirty.current = true;
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }

  const move = (sceneId: string, toDay: string | null, index?: number) =>
    apply(moveScene({ days: days.map((d) => ({ id: d.id, sceneIds: d.sceneIds })), bank }, sceneId, toDay, index));

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await flush();
      await fn();
    });

  function patchDay(day: BoardDay, field: "shoot_date" | "general_call" | "wrap_time" | "location_contact_id", value: string) {
    setDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, [field]: value || null } : d)));
    void updateShootDay({ projectId, dayId: day.id, [field]: value });
  }

  // ── drag and drop ──
  const onDragOverList = (day: string | null, count: number) => (e: React.DragEvent) => {
    if (!dragId) return;
    e.preventDefault();
    if (e.target === e.currentTarget) setDropAt({ day, index: count });
  };
  const onDragOverStrip = (day: string | null, index: number) => (e: React.DragEvent<HTMLElement>) => {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setDropAt({ day, index: e.clientY > r.top + r.height / 2 ? index + 1 : index });
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragId && dropAt) move(dragId, dropAt.day, dropAt.index);
    setDragId(null);
    setDropAt(null);
  };

  const statusText = save === "saving" ? s.saving : save === "error" ? s.saveFailed : save === "dirty" ? s.saving : s.saved;
  const totalScheduled = days.reduce((n, d) => n + d.sceneIds.length, 0);

  function renderStrip(id: string, day: string | null, index: number) {
    const sc = scenes[id];
    if (!sc) return null;
    const color = stripColor(sc.int_ext, sc.day_night);
    const list = day === null ? bank : (days.find((d) => d.id === day)?.sceneIds ?? []);
    const showLine = dropAt && dropAt.day === day && dropAt.index === index && dragId !== id;
    return (
      <li
        key={id}
        draggable={!readOnly}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", id);
          setDragId(id);
        }}
        onDragEnd={() => {
          setDragId(null);
          setDropAt(null);
        }}
        onDragOver={onDragOverStrip(day, index)}
        onDrop={onDrop}
        className={`group relative grid cursor-grab grid-cols-[22px_44px_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-black/5 py-2 pe-2 text-[12px] active:cursor-grabbing sm:grid-cols-[22px_44px_70px_minmax(0,1fr)_64px_92px_auto] ${dragId === id ? "opacity-40" : ""}`}
        style={{ background: color.bg, borderInlineStart: `5px solid ${color.edge}` }}
      >
        {showLine ? <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-0.5 bg-accent" /> : null}
        <span aria-hidden className="ps-1.5 text-[14px] leading-none text-faint">⋮⋮</span>
        <span className="font-extrabold">{sc.scene_number}</span>
        <span className="font-bold max-sm:hidden">
          {t.intExt[sc.int_ext]} · {t.dayNight[sc.day_night]}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold">{sc.location_name || "—"}</span>
          {sc.synopsis ? <span className="block truncate text-[11px] text-body">{sc.synopsis}</span> : null}
          <span className="block text-[11px] text-muted sm:hidden">
            {t.intExt[sc.int_ext]} · {t.dayNight[sc.day_night]} · {formatEighths(sc.page_eighths || 0)}
          </span>
        </span>
        <span className="text-end font-semibold max-sm:hidden" dir="ltr">
          {formatEighths(sc.page_eighths || 0)}
        </span>
        <span className="truncate text-[11px] font-semibold text-body max-sm:hidden" dir="ltr" title={s.cast}>
          {(cast[id] ?? []).join(", ")}
        </span>
        <span className={`flex items-center gap-0.5 ${readOnly ? "invisible" : ""}`}>
          <button type="button" aria-label={s.up} disabled={index === 0} onClick={() => move(id, day, index - 1)} className="size-7 rounded text-muted hover:bg-black/5 disabled:opacity-30">
            ▲
          </button>
          <button type="button" aria-label={s.down} disabled={index === list.length - 1} onClick={() => move(id, day, index + 2)} className="size-7 rounded text-muted hover:bg-black/5 disabled:opacity-30">
            ▼
          </button>
          <select
            aria-label={s.moveTo}
            value={day ?? ""}
            onChange={(e) => move(id, e.target.value || null)}
            className="h-7 max-w-[92px] rounded border border-black/10 bg-white/70 px-1 text-[11px] font-semibold"
          >
            <option value="">{s.unscheduled}</option>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                {s.day} {d.day_number}
              </option>
            ))}
          </select>
        </span>
      </li>
    );
  }

  const listEnd = (day: string | null, count: number) =>
    dropAt && dropAt.day === day && dropAt.index === count ? <li aria-hidden className="h-0.5 bg-accent" /> : null;

  return (
    <div className="grid flex-1 content-start items-start gap-4 p-5 max-sm:p-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* Shoot days */}
      <section aria-label={s.stripboard} className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {!readOnly ? <button type="button" className="btn-primary" disabled={pending} onClick={() => run(() => addShootDay(projectId))}>
            + {s.addDay}
          </button> : null}
          {!readOnly && scriptId && bank.length ? (
            <details className="relative">
              <summary className="btn-soft cursor-pointer list-none [&::-webkit-details-marker]:hidden">{s.auto}</summary>
              <div className="absolute start-0 top-11 z-30 w-[290px] rounded-[10px] border border-line bg-white p-4 shadow-lg">
                <p className="text-[12px] leading-relaxed text-muted">{s.autoHint}</p>
                <label className="label mt-3" htmlFor="ppd">
                  {s.pagesPerDay}
                </label>
                <div className="flex gap-2">
                  <input id="ppd" type="number" min={0.5} max={30} step={0.5} value={pagesPerDay} onChange={(e) => setPagesPerDay(Number(e.target.value))} className="field" />
                  <button type="button" className="btn-primary" disabled={pending} onClick={() => run(() => autoSchedule(projectId, scriptId, pagesPerDay))}>
                    {s.run}
                  </button>
                </div>
              </div>
            </details>
          ) : null}
          <span className="text-[12px] text-muted">
            {days.length} {s.days} · {totalScheduled} {s.scenes} · {formatEighths(days.reduce((n, d) => n + sumEighths(d.sceneIds.map((x) => scenes[x]).filter(Boolean)), 0))} {s.pages}
          </span>
          <span role="status" aria-live="polite" className={`ms-auto text-[12px] font-semibold ${save === "error" ? "text-warn" : "text-muted"}`}>
            {statusText}
          </span>
        </div>

        {!days.length ? <div className="card px-6 py-14 text-center text-muted">{s.noDays}</div> : null}

        <div className="flex flex-col gap-4">
          {days.map((day) => {
            const list = day.sceneIds.filter((x) => scenes[x]);
            const eighths = sumEighths(list.map((x) => scenes[x]));
            return (
              <article key={day.id} className="card overflow-hidden" aria-labelledby={`day-${day.id}`}>
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
                  <h2 id={`day-${day.id}`} className="text-[14px] font-extrabold">
                    {s.day} {day.day_number}
                  </h2>
                  <span className="text-[12px] text-muted">
                    {[day.shoot_date ? dateFmt.format(new Date(day.shoot_date)) : null, day.general_call ? `${s.generalCall} ${day.general_call.slice(0, 5)}` : null, locName(day.location_contact_id)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="ms-auto flex items-center gap-1">
                    {!readOnly ? <button type="button" className="btn-ghost h-8 px-2.5" aria-expanded={editing === day.id} onClick={() => setEditing(editing === day.id ? null : day.id)}>
                      {editing === day.id ? s.done : s.edit}
                    </button> : null}
                    {showCallSheets ? <Link href={`/projects/${projectId}/call-sheets/${day.id}`} className="btn-soft h-8 px-2.5">
                      {s.callSheet}
                    </Link> : null}
                    {!readOnly ? <button
                      type="button"
                      className="btn-danger h-8 px-2.5"
                      disabled={pending}
                      onClick={() => window.confirm(s.deleteDayConfirm) && run(() => deleteShootDay(projectId, day.id))}
                    >
                      {s.deleteDay}
                    </button> : null}
                  </span>
                </header>
                {editing === day.id ? (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 border-b border-line bg-ground/60 px-4 py-3">
                    <label>
                      <span className="label">{s.date}</span>
                      <input type="date" className="field" defaultValue={day.shoot_date ?? ""} onChange={(e) => patchDay(day, "shoot_date", e.target.value)} />
                    </label>
                    <label>
                      <span className="label">{s.generalCall}</span>
                      <input type="time" className="field" defaultValue={day.general_call?.slice(0, 5) ?? ""} onChange={(e) => patchDay(day, "general_call", e.target.value)} />
                    </label>
                    <label>
                      <span className="label">{s.wrap}</span>
                      <input type="time" className="field" defaultValue={day.wrap_time?.slice(0, 5) ?? ""} onChange={(e) => patchDay(day, "wrap_time", e.target.value)} />
                    </label>
                    <label>
                      <span className="label">{s.location}</span>
                      <select className="field" defaultValue={day.location_contact_id ?? ""} onChange={(e) => patchDay(day, "location_contact_id", e.target.value)}>
                        <option value="">{s.noLocation}</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
                <ul className="min-h-12" onDragOver={onDragOverList(day.id, list.length)} onDrop={onDrop}>
                  {list.map((id, i) => (
                    renderStrip(id, day.id, i)
                  ))}
                  {listEnd(day.id, list.length)}
                  {!list.length ? <li className="pointer-events-none px-4 py-4 text-center text-[12px] text-faint">{s.dropHere}</li> : null}
                </ul>
                <footer className="flex items-center justify-between bg-rail px-4 py-2 text-[12px] font-bold text-white">
                  <span>
                    {s.endOfDay} {day.day_number}
                  </span>
                  <span>
                    {list.length} {s.scenes} · {formatEighths(eighths)} {s.pages}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-faint">{s.dragHint}</p>
      </section>

      {/* Unscheduled bank */}
      <aside aria-labelledby="bank-h" className="card overflow-hidden max-xl:order-first xl:sticky xl:top-4">
        <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
          <h2 id="bank-h" className="text-[14px] font-extrabold">
            {s.unscheduled}
          </h2>
          <span className="text-[12px] text-muted">
            {bank.length} · {formatEighths(sumEighths(bank.map((x) => scenes[x]).filter(Boolean)))} {s.pages}
          </span>
        </div>
        <ul className="max-h-[70vh] min-h-16 overflow-y-auto" onDragOver={onDragOverList(null, bank.length)} onDrop={onDrop}>
          {bank.map((id, i) => (
            renderStrip(id, null, i)
          ))}
          {listEnd(null, bank.length)}
          {!bank.length ? <li className="pointer-events-none px-4 py-6 text-center text-[12px] text-muted">{s.allScheduled}</li> : null}
        </ul>
      </aside>
    </div>
  );
}
