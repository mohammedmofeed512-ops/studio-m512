import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { docToLines } from "@/lib/screenplay/model";
import { formatDuration, rowSeconds, sanitizeAvDoc, totalSeconds } from "@/lib/screenplay/av";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { PrintBar } from "./print-bar";

export async function generateMetadata({ params }: PageProps<"/print/scripts/[scriptId]">): Promise<Metadata> {
  const { scriptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(scriptId)) return {};
  const { supabase } = await getViewer();
  const { data } = await supabase.from("scripts").select("title").eq("id", scriptId).maybeSingle();
  // The document title becomes the PDF's default file name.
  return { title: { absolute: data?.title ?? "Script" } };
}

export default async function PrintScriptPage({ params }: PageProps<"/print/scripts/[scriptId]">) {
  const { scriptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(scriptId)) notFound();
  const [{ t }, viewer] = await Promise.all([getI18n(), getViewer()]);
  const { data: script } = await viewer.supabase.from("scripts").select("id, title, kind, language, current_version_id, project:projects(name)").eq("id", scriptId).maybeSingle();
  if (!script) notFound();
  const { data: version } = await viewer.supabase.from("script_versions").select("content, version_number, revision_color, created_at").eq("id", script.current_version_id ?? "").maybeSingle();

  const lang = script.language === "en" ? "en" : "ar";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const st = dictionaries[lang].scripts;
  const dateFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-dvh bg-ground print:bg-white">
      <PrintBar label={t.scripts.print} back={t.scripts.back} />
      <div dir={dir} lang={lang} className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-8 print:block print:p-0">
        {/* Title page */}
        <section className="print-page flex min-h-[70vh] flex-col items-center justify-center rounded-[10px] bg-white px-10 py-16 text-center print:min-h-[240mm]" style={{ breakAfter: "page" }}>
          <h1 className="text-[28px] font-extrabold" style={{ fontFamily: lang === "ar" ? "var(--font-script)" : "'Courier Prime', monospace" }}>
            {script.title}
          </h1>
          <p className="mt-6 text-[14px] text-body">{st.writtenBy}</p>
          <p className="mt-1 text-[16px] font-bold">{viewer.name}</p>
          <div className="mt-auto pt-16 text-[12px] text-muted">
            <p dir="ltr">{viewer.company}</p>
            <p>
              {st.version} {version?.version_number ?? 1} · {dictionaries[lang].revisionColors[(version?.revision_color ?? "white") as keyof (typeof dictionaries)["ar"]["revisionColors"]]}
              {version?.created_at ? ` · ${dateFmt.format(new Date(version.created_at))}` : ""}
            </p>
          </div>
        </section>

        {script.kind === "av" ? (
          <AvPrint content={version?.content} labels={st} />
        ) : (
          <section className="print-page rounded-[10px] bg-white px-[72px] py-16 print:px-0">
            <div className="screenplay" lang={lang} dir={dir}>
              {docToLines(version?.content).map((line, i) => (
                <p key={i} className="sp-el" data-kind={line.kind}>
                  {line.text}
                </p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AvPrint({ content, labels }: { content: unknown; labels: (typeof dictionaries)["ar"]["scripts"] }) {
  const { rows } = sanitizeAvDoc(content);
  return (
    <section className="print-page rounded-[10px] bg-white p-8 print:p-0">
      <p className="mb-3 text-[12px] font-bold text-muted">
        {labels.avTotal}: {formatDuration(totalSeconds(rows))}
      </p>
      <table className="w-full border-collapse text-[13px] leading-relaxed">
        <thead>
          <tr>
            <th className="th w-8">#</th>
            <th className="th">{labels.avVideo}</th>
            <th className="th">{labels.avAudio}</th>
            <th className="th w-16">{labels.avSeconds}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="av-row align-top">
              <td className="td font-bold">{i + 1}</td>
              <td className="td whitespace-pre-wrap">{r.video}</td>
              <td className="td whitespace-pre-wrap">{r.audio}</td>
              <td className="td">{formatDuration(rowSeconds(r))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
