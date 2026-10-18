import type { Metadata } from "next";
import { CallSheetDocument } from "@/components/call-sheet/document";
import { slugLabels } from "@/components/production/scene-picker";
import { createClient } from "@/lib/supabase/server";
import { fill, type CallSheetData } from "@/lib/production/schedule";
import { getI18n } from "@/lib/i18n/server";
import { PublicActions } from "./actions";

export const metadata: Metadata = { title: "Call Sheet", robots: { index: false, follow: false } };

/** A crew member's personal call sheet, opened from the link they were sent. No account needed. */
export default async function PublicCallSheet({ params }: PageProps<"/c/[token]">) {
  const { token } = await params;
  const [{ t, locale }, supabase] = await Promise.all([getI18n(), createClient()]);
  const valid = /^[0-9a-f]{48}$/.test(token);
  const [{ data }, { data: claims }] = await Promise.all([
    valid ? supabase.rpc("call_sheet_view", { p_token: token }) : Promise.resolve({ data: null }),
    supabase.auth.getClaims(),
  ]);
  const sheet = data as unknown as CallSheetData | null;

  if (!sheet) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="card max-w-md px-8 py-10 text-center text-muted">{t.publicSheet.invalid}</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-ground pb-10 print:bg-white">
      <div className="no-print bg-rail px-4 py-3 text-center text-[12px] font-bold text-white">
        {sheet.company || "Studio M512"} · {fill(t.callSheets.dayXofY, { x: sheet.day.number, y: sheet.day.total })}
      </div>
      <PublicActions
        token={token}
        confirmed={sheet.recipient?.status === "confirmed"}
        trackOpen={!claims?.claims?.sub}
        labels={{ confirm: t.publicSheet.confirm, confirmed: t.publicSheet.confirmed, print: t.publicSheet.print }}
      />
      <div className="px-4 print:p-0">
        <CallSheetDocument data={sheet} locale={locale} t={{ cs: t.callSheets, sch: t.schedule, contactKinds: t.contactKinds, ...slugLabels(locale) }} />
      </div>
    </main>
  );
}
