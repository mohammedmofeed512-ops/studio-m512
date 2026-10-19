import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { fill } from "@/lib/production/schedule";
import { LocalTime } from "./local-time";

/** The project's latest activity: who did what, newest first. */
export async function ActivityFeed({ projectId }: { projectId: string }) {
  const [{ t, intlLocale }, { supabase, userId }] = await Promise.all([getI18n(), getViewer()]);
  const { data: rows } = await supabase
    .from("activity_log")
    .select("id, user_id, action, summary, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(15);
  const ids = [...new Set((rows ?? []).map((r) => r.user_id).filter((x): x is string => Boolean(x)))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const a = t.activity as Record<string, string>;

  return (
    <section aria-labelledby="act-h" className="card self-start overflow-hidden">
      <div className="card-head">
        <h2 id="act-h" className="card-title">
          {t.activity.title}
        </h2>
      </div>
      {rows?.length ? (
        <ol className="px-6 py-2">
          {rows.map((r) => {
            const who = r.user_id === userId ? t.team.you : (r.user_id && names.get(r.user_id)) || t.activity.someone;
            const what = a[r.action] ? fill(a[r.action], { summary: r.summary ?? "" }) : r.action;
            return (
              <li key={r.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                <span className="min-w-0">
                  <span className="font-bold">{who}</span> <span className="text-body">{what}</span>
                </span>
                <LocalTime iso={r.created_at} locale={intlLocale} />
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-6 py-8 text-center text-muted">{t.activity.empty}</p>
      )}
    </section>
  );
}
