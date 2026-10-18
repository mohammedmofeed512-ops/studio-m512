import { formatEighths } from "@/lib/screenplay/model";
import { fill, type CallSheetData } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Labels = { cs: Dictionary["callSheets"]; sch: Dictionary["schedule"]; intExt: Record<string, string>; dayNight: Record<string, string>; contactKinds: Dictionary["contactKinds"] };

/** The call sheet page itself: shared by the owner's preview/print and the crew's personal link. */
export function CallSheetDocument({ data, t, locale }: { data: CallSheetData; t: Labels; locale: "ar" | "en" }) {
  const { cs, sch } = t;
  const date = data.day.date
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(data.day.date))
    : "";
  const pages = data.scenes.reduce((n, s) => n + (s.page_eighths || 0), 0);
  const th = "border-b-2 border-ink px-2 py-1.5 text-start text-[11px] font-extrabold";
  const td = "border-b border-line px-2 py-2 align-top";

  return (
    <article className="call-sheet mx-auto w-full max-w-[8.5in] rounded-[10px] bg-white p-8 text-[13px] text-ink max-sm:p-4 print:max-w-none print:rounded-none print:p-0">
      <header className="grid grid-cols-3 gap-4 border-b-2 border-ink pb-4 max-sm:grid-cols-1">
        <div>
          {data.company ? <p className="text-[11px] font-bold text-muted" dir="auto">{data.company}</p> : null}
          <h1 className="text-[18px] font-extrabold leading-tight">{data.project}</h1>
          <p className="mt-1 font-bold">{fill(cs.dayXofY, { x: data.day.number, y: data.day.total })}</p>
          {date ? <p className="text-muted">{date}</p> : null}
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg bg-ground py-3 text-center print:border print:border-ink print:bg-white">
          <p className="text-[11px] font-extrabold text-muted">{sch.generalCall}</p>
          <p className="text-[34px] font-extrabold leading-none" dir="ltr">
            {data.day.general_call ?? "—"}
          </p>
          {data.day.wrap_time ? (
            <p className="mt-1 text-[11px] text-muted">
              {sch.wrap} <span dir="ltr">{data.day.wrap_time}</span>
            </p>
          ) : null}
        </div>
        <dl className="grid content-start gap-1.5 text-[12px]">
          <div>
            <dt className="text-[11px] font-bold text-muted">{sch.location}</dt>
            <dd className="font-bold">{data.location?.name ?? "—"}</dd>
            {data.location?.address ? <dd className="text-body">{data.location.address}</dd> : null}
          </div>
          {data.sheet.weather ? (
            <div>
              <dt className="text-[11px] font-bold text-muted">{cs.weather}</dt>
              <dd>{data.sheet.weather}</dd>
            </div>
          ) : null}
          {data.sheet.nearest_hospital ? (
            <div>
              <dt className="text-[11px] font-bold text-muted">{cs.hospital}</dt>
              <dd>{data.sheet.nearest_hospital}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      {data.recipient ? (
        <p className="mt-4 rounded-lg bg-tint px-4 py-3 font-bold text-accent-ink">
          {data.recipient.name} · {cs.callTime}: <span dir="ltr">{data.recipient.call_time ?? data.day.general_call ?? "—"}</span>
        </p>
      ) : null}

      {data.sheet.general_notes ? (
        <section className="mt-4 whitespace-pre-wrap rounded-lg border border-line px-4 py-3 leading-relaxed">
          <h2 className="mb-1 text-[11px] font-extrabold text-muted">{cs.notes}</h2>
          {data.sheet.general_notes}
        </section>
      ) : null}

      <section className="mt-5 overflow-x-auto">
        <h2 className="mb-1.5 text-[13px] font-extrabold">
          {cs.scenes} <span className="font-semibold text-muted">· {formatEighths(pages)} {sch.pages}</span>
        </h2>
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className={th}>{cs.sceneHeader}</th>
              <th className={th}>{cs.setting}</th>
              <th className={th}>{cs.dn}</th>
              <th className={th}>{cs.pagesShort}</th>
              <th className={th}>{sch.cast}</th>
              <th className={th}>{cs.description}</th>
            </tr>
          </thead>
          <tbody>
            {data.scenes.length ? (
              data.scenes.map((s, i) => (
                <tr key={i} className="break-inside-avoid">
                  <td className={`${td} font-extrabold`}>{s.scene_number}</td>
                  <td className={`${td} font-bold`}>
                    {t.intExt[s.int_ext]} · {s.location_name ?? "—"}
                  </td>
                  <td className={td}>{t.dayNight[s.day_night]}</td>
                  <td className={td} dir="ltr">
                    {formatEighths(s.page_eighths || 0)}
                  </td>
                  <td className={td} dir="ltr">
                    {s.cast.join(", ")}
                  </td>
                  <td className={`${td} text-body`}>{s.synopsis}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={`${td} text-center text-muted`}>
                  {cs.noScenes}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {data.cast.length ? (
        <section className="mt-5 overflow-x-auto">
          <h2 className="mb-1.5 text-[13px] font-extrabold">{cs.cast}</h2>
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-10`}>#</th>
                <th className={th}>{cs.character}</th>
                <th className={th}>{cs.actor}</th>
                <th className={th}>{cs.callTime}</th>
              </tr>
            </thead>
            <tbody>
              {data.cast.map((c, i) => (
                <tr key={i}>
                  <td className={`${td} font-bold`}>{c.number ?? ""}</td>
                  <td className={`${td} font-bold`}>{c.character}</td>
                  <td className={td}>{c.actor ?? <span className="text-faint">{cs.unassigned}</span>}</td>
                  <td className={td} dir="ltr">
                    {c.call_time ?? data.day.general_call ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {data.people.length ? (
        <section className="mt-5 overflow-x-auto">
          <h2 className="mb-1.5 text-[13px] font-extrabold">{cs.people}</h2>
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                <th className={th}>{t.contactKinds.crew}</th>
                <th className={th}>{cs.role}</th>
                <th className={th}>{cs.callTime}</th>
              </tr>
            </thead>
            <tbody>
              {data.people.map((p, i) => (
                <tr key={i}>
                  <td className={`${td} font-bold`}>{p.name}</td>
                  <td className={td}>{p.role || t.contactKinds[p.kind]}</td>
                  <td className={td} dir="ltr">
                    {p.call_time ?? data.day.general_call ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </article>
  );
}
