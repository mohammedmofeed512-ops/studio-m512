import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { IconArchive, IconProjects } from "@/components/icons";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const view = (await searchParams).view === "archived" ? "archived" : "all";
  const [{ t, formatDate }, { supabase }] = await Promise.all([getI18n(), getViewer()]);

  const { data: all } = await supabase
    .from("projects")
    .select("id, name, type, stage, cover_color, client_name, delivery_date")
    .order("updated_at", { ascending: false });

  const archived = (all ?? []).filter((p) => p.stage === "archived");
  const active = (all ?? []).filter((p) => p.stage !== "archived");
  const shown = view === "archived" ? archived : active;

  return (
    <>
      <PageHeader crumbs={t.projects.title} />
      <SubToolbar icon={<IconProjects size={14} />} title={view === "archived" ? t.projects.archived : t.projects.all}>
        <Link href="/projects/new" className="btn-primary h-8">
          + {t.projects.new}
        </Link>
      </SubToolbar>

      <div className="flex flex-1 flex-wrap">
        <aside className="flex w-[250px] shrink-0 flex-col gap-0.5 border-e border-line bg-white px-3 py-4 max-md:w-full max-md:flex-row max-md:border-e-0 max-md:border-b">
          <Link href="/projects" aria-current={view === "all" ? "page" : undefined} className="pill-nav">
            <span className="flex items-center gap-2.5">
              <IconProjects size={15} />
              {t.projects.all}
            </span>
            <span className="text-[11px]">{active.length}</span>
          </Link>
          <Link href="/projects?view=archived" aria-current={view === "archived" ? "page" : undefined} className="pill-nav">
            <span className="flex items-center gap-2.5">
              <IconArchive size={15} />
              {t.projects.archived}
            </span>
            <span className="text-[11px]">{archived.length}</span>
          </Link>
        </aside>

        <main className="min-w-0 flex-1 p-6 max-sm:p-4">
          {shown.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
              {shown.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="card group overflow-hidden transition-shadow hover:shadow-[0_2px_12px_rgba(29,30,44,0.08)]">
                  <div className="flex h-28 items-end p-3.5" style={{ background: p.cover_color ?? "#2B3240" }}>
                    <span className="badge bg-white/90 text-ink">{t.projectTypes[p.type]}</span>
                  </div>
                  <div className="flex flex-col gap-1 px-4 py-3.5">
                    <h2 className="truncate text-[15px] font-extrabold group-hover:text-accent-ink">{p.name}</h2>
                    <p className="text-[12px] text-muted">
                      {t.projectStages[p.stage]}
                      {p.client_name ? ` · ${p.client_name}` : ""}
                    </p>
                    {p.delivery_date ? (
                      <p className="text-[12px] text-muted">
                        {t.projects.deliveryDate}: {formatDate(p.delivery_date)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-24 text-center">
              <span className="flex size-[84px] items-center justify-center rounded-full bg-tint text-accent">
                <IconProjects size={34} />
              </span>
              <h2 className="mt-5 text-[22px] font-extrabold">{t.projects.empty}</h2>
              <p className="mt-1.5 text-body">{t.projects.emptyHint}</p>
              <Link href="/projects/new" className="btn-primary mt-5 h-10 px-5">
                + {t.projects.new}
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
