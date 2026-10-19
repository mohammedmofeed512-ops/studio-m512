import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconCalendar } from "@/components/icons";
import { slugLabels } from "@/components/production/scene-picker";
import { Recipients, type Recipient } from "@/components/call-sheet/recipients";
import { CastActorSelect, SaveButton } from "@/components/call-sheet/small";
import { saveCallSheet } from "@/lib/schedule-actions";
import { isUuid } from "@/lib/production/load";
import { formatEighths } from "@/lib/screenplay/model";
import type { CallSheetData } from "@/lib/production/schedule";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { getAccess } from "@/lib/access";
import { canEdit, canView } from "@/lib/permissions";
import { EditGate, NoAccessPage, ReadOnlyBanner } from "@/components/access";

export const metadata: Metadata = { title: "Call Sheet" };

export default async function CallSheetPage({ params }: PageProps<"/projects/[id]/call-sheets/[dayId]">) {
  const { id, dayId } = await params;
  if (!isUuid(id) || !isUuid(dayId)) notFound();
  const [{ t, locale }, { supabase }] = await Promise.all([getI18n(), getViewer()]);

  const [{ data: project }, { data: day }, { data: allDays }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("shoot_days").select("*, shoot_day_scenes(scene_id)").eq("id", dayId).eq("project_id", id).maybeSingle(),
    supabase.from("shoot_days").select("id, day_number").eq("project_id", id).order("day_number"),
  ]);
  const access = await getAccess(id);
  if (!project || !day || !access) notFound();
  if (!canView(access, "call_sheets")) return <NoAccessPage projectId={id} projectName={project.name} title={t.callSheets.title} t={t} />;
  const editable = canEdit(access, "call_sheets");

  // Each shoot day gets its call sheet when the day is created; older days get one here.
  if (editable) await supabase.from("call_sheets").upsert({ shoot_day_id: dayId }, { onConflict: "shoot_day_id", ignoreDuplicates: true });
  const sceneIds = day.shoot_day_scenes.map((x) => x.scene_id);
  const [{ data: sheet }, { data: rpc }, { data: contacts }, { data: castLinks }] = await Promise.all([
    supabase.from("call_sheets").select("*").eq("shoot_day_id", dayId).single(),
    supabase.rpc("call_sheet_for_day", { p_day: dayId }),
    supabase.from("contacts").select("id, full_name, kind, role, phone, email").eq("owner_id", access.ownerId).order("full_name"),
    sceneIds.length
      ? supabase.from("scene_elements").select("element:elements!inner(id, name, cast_number, contact_id, category)").in("scene_id", sceneIds).eq("element.category", "cast")
      : Promise.resolve({ data: [] as Array<{ element: { id: string; name: string; cast_number: number | null; contact_id: string | null } }> }),
  ]);
  if (!sheet) notFound();
  const { data: recRows } = await supabase
    .from("call_sheet_recipients")
    .select("id, token, status, call_time, opened_at, confirmed_at, contact:contacts(id, full_name, role, phone, email, kind)")
    .eq("call_sheet_id", sheet.id);

  const data = rpc as unknown as CallSheetData | null;
  const castMap = new Map<string, { id: string; name: string; cast_number: number | null; contact_id: string | null }>();
  for (const l of castLinks ?? []) {
    const el = Array.isArray(l.element) ? l.element[0] : l.element;
    if (el) castMap.set(el.id, el);
  }
  const castRows = [...castMap.values()].sort((a, b) => (a.cast_number ?? 999) - (b.cast_number ?? 999) || a.name.localeCompare(b.name));
  const recipients = (recRows ?? [])
    .map((r) => ({ ...r, contact: Array.isArray(r.contact) ? r.contact[0] : r.contact }))
    .filter((r): r is Recipient => Boolean(r.contact))
    .sort((a, b) => (a.call_time ?? "99").localeCompare(b.call_time ?? "99") || a.contact.full_name.localeCompare(b.contact.full_name));

  const cs = t.callSheets;
  const sch = t.schedule;
  const labels = slugLabels(locale);
  const idx = (allDays ?? []).findIndex((d) => d.id === dayId);
  const prev = allDays?.[idx - 1];
  const next = allDays?.[idx + 1];
  const locations = (contacts ?? []).filter((c) => c.kind === "location");
  const actors = (contacts ?? []).filter((c) => c.kind === "cast");

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            <Link href={`/projects/${id}/call-sheets`} className="text-muted hover:text-ink">
              {cs.title}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {sch.day} {day.day_number}
          </>
        }
      />
      <SubToolbar icon={<IconCalendar size={14} />} title={`${cs.title} · ${sch.day} ${day.day_number}`} meta={`${sceneIds.length} ${sch.scenes} · ${formatEighths(data?.scenes.reduce((n, s) => n + s.page_eighths, 0) ?? 0)} ${sch.pages}`}>
        <nav aria-label={sch.days} className="flex items-center gap-1">
          {prev ? (
            <Link href={`/projects/${id}/call-sheets/${prev.id}`} className="btn-ghost h-8 border border-line px-2.5">
              <span aria-hidden className="rtl:rotate-180">←</span> {sch.day} {prev.day_number}
            </Link>
          ) : null}
          {next ? (
            <Link href={`/projects/${id}/call-sheets/${next.id}`} className="btn-ghost h-8 border border-line px-2.5">
              {sch.day} {next.day_number} <span aria-hidden className="rtl:rotate-180">→</span>
            </Link>
          ) : null}
        </nav>
        <a href={`/print/call-sheets/${dayId}`} target="_blank" rel="noreferrer" className="btn-primary h-8">
          {cs.preview}
        </a>
      </SubToolbar>
      {!editable ? <ReadOnlyBanner t={t} /> : null}

      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={id} />
        <EditGate editable={editable}>
        <main className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(380px,1fr))] content-start gap-3 p-5 max-sm:grid-cols-1 max-sm:p-3">
          <div className="flex min-w-0 flex-col gap-3">
            <section aria-labelledby="det-h" className="card overflow-hidden">
              <div className="card-head">
                <h2 id="det-h" className="card-title">
                  {cs.details}
                </h2>
              </div>
              <form action={saveCallSheet} className="grid grid-cols-2 gap-3 p-6 max-sm:grid-cols-1">
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="day_id" value={dayId} />
                <label>
                  <span className="label">{sch.date}</span>
                  <input type="date" name="shoot_date" defaultValue={day.shoot_date ?? ""} className="field" />
                </label>
                <label>
                  <span className="label">{sch.location}</span>
                  <select name="location_contact_id" defaultValue={day.location_contact_id ?? ""} className="field">
                    <option value="">{sch.noLocation}</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label">{sch.generalCall}</span>
                  <input type="time" name="general_call" defaultValue={day.general_call?.slice(0, 5) ?? ""} className="field" />
                </label>
                <label>
                  <span className="label">{sch.wrap}</span>
                  <input type="time" name="wrap_time" defaultValue={day.wrap_time?.slice(0, 5) ?? ""} className="field" />
                </label>
                <label>
                  <span className="label">{cs.weather}</span>
                  <input name="weather" defaultValue={sheet.weather ?? ""} maxLength={200} className="field" />
                </label>
                <label>
                  <span className="label">{cs.hospital}</span>
                  <input name="nearest_hospital" defaultValue={sheet.nearest_hospital ?? ""} maxLength={300} className="field" />
                </label>
                <label className="col-span-full">
                  <span className="label">{cs.notes}</span>
                  <textarea name="general_notes" defaultValue={sheet.general_notes ?? ""} rows={4} maxLength={4000} className="field h-auto py-2 leading-relaxed" />
                </label>
                <div className="col-span-full">
                  <SaveButton label={t.common.save} pendingLabel={sch.saving} />
                </div>
              </form>
            </section>

            <section aria-labelledby="sc-h" className="card overflow-hidden">
              <div className="card-head">
                <h2 id="sc-h" className="card-title">
                  {cs.scenes}
                </h2>
                <Link href={`/projects/${id}/schedule`} className="btn-ghost h-8">
                  {sch.title}
                </Link>
              </div>
              <div className="overflow-x-auto px-4 pb-2">
                <table className="w-full min-w-[460px] border-collapse">
                  <thead>
                    <tr>
                      <th className="th">{cs.sceneHeader}</th>
                      <th className="th">{cs.setting}</th>
                      <th className="th">{cs.dn}</th>
                      <th className="th">{cs.pagesShort}</th>
                      <th className="th">{sch.cast}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.scenes.length ? (
                      data.scenes.map((s, i) => (
                        <tr key={i}>
                          <td className="td font-extrabold">{s.scene_number}</td>
                          <td className="td font-semibold">
                            {labels.intExt[s.int_ext]} · {s.location_name ?? "—"}
                          </td>
                          <td className="td">{labels.dayNight[s.day_night]}</td>
                          <td className="td" dir="ltr">
                            {formatEighths(s.page_eighths || 0)}
                          </td>
                          <td className="td" dir="ltr">
                            {s.cast.join(", ")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="td text-center text-muted">
                          {cs.noScenes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {castRows.length ? (
              <section aria-labelledby="cast-h" className="card overflow-hidden">
                <div className="card-head">
                  <h2 id="cast-h" className="card-title">
                    {cs.cast}
                  </h2>
                </div>
                <ul>
                  {castRows.map((c) => (
                    <li key={c.id} className="grid grid-cols-[32px_1fr_minmax(0,200px)] items-center gap-3 border-b border-line px-6 py-2.5 last:border-b-0">
                      <span className="font-extrabold text-muted">{c.cast_number ?? ""}</span>
                      <span className="font-bold">{c.name}</span>
                      <CastActorSelect projectId={id} elementId={c.id} value={c.contact_id} actors={actors} emptyLabel={cs.unassigned} label={`${cs.actor}: ${c.name}`} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <Recipients
            projectId={id}
            callSheetId={sheet.id}
            projectName={project.name}
            dayNumber={day.day_number}
            generalCall={day.general_call}
            recipients={recipients}
            contacts={contacts ?? []}
            t={cs}
            kinds={t.contactKinds}
            planLabels={t.plan}
          />
        </main>
        </EditGate>
      </div>
    </>
  );
}
