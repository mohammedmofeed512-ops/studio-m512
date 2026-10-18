import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CallSheetDocument } from "@/components/call-sheet/document";
import { slugLabels } from "@/components/production/scene-picker";
import { fill, type CallSheetData } from "@/lib/production/schedule";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { PrintBar } from "../../scripts/[scriptId]/print-bar";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(dayId: string) {
  if (!UUID.test(dayId)) return null;
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("call_sheet_for_day", { p_day: dayId });
  return data as unknown as CallSheetData | null;
}

export async function generateMetadata({ params }: PageProps<"/print/call-sheets/[dayId]">): Promise<Metadata> {
  const { dayId } = await params;
  const [data, { t }] = await Promise.all([load(dayId), getI18n()]);
  return { title: { absolute: data ? `${data.project} - ${t.callSheets.title} - ${fill(t.callSheets.dayXofY, { x: data.day.number, y: data.day.total })}` : "Call Sheet" } };
}

export default async function PrintCallSheet({ params }: PageProps<"/print/call-sheets/[dayId]">) {
  const { dayId } = await params;
  const [data, { t, locale }] = await Promise.all([load(dayId), getI18n()]);
  if (!data) notFound();
  return (
    <div className="min-h-dvh bg-ground print:bg-white">
      <PrintBar label={t.scripts.print} back={t.scripts.back} />
      <div className="px-4 py-8 print:p-0">
        <CallSheetDocument data={data} locale={locale} t={{ cs: t.callSheets, sch: t.schedule, contactKinds: t.contactKinds, ...slugLabels(locale) }} />
      </div>
    </div>
  );
}
