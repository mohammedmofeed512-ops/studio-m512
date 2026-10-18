import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconProjects } from "@/components/icons";
import { LookbookBoard } from "@/components/production/lookbook-board";
import { isUuid } from "@/lib/production/load";
import { signMedia } from "@/lib/supabase/media";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Lookbook" };

export default async function LookbookPage({ params }: PageProps<"/projects/[id]/lookbook">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [{ t }, { supabase, userId }] = await Promise.all([getI18n(), getViewer()]);
  const [{ data: project }, { data: items }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("lookbook_items").select("id, category, note, image_path, position").eq("project_id", id).order("position", { ascending: false }),
  ]);
  if (!project) notFound();
  const urls = await signMedia(supabase, (items ?? []).map((i) => i.image_path));

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {t.lookbook.title}
          </>
        }
      />
      <SubToolbar icon={<IconProjects size={14} />} title={t.lookbook.title} meta={`${items?.length ?? 0} ${t.lookbook.images}`} />
      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={id} />
        <main className="min-w-0 flex-1 p-6 max-sm:p-4">
          <LookbookBoard
            projectId={id}
            userId={userId}
            items={(items ?? []).map((i) => ({ id: i.id, category: i.category, note: i.note, url: urls.get(i.image_path) ?? null }))}
            t={{ lookbook: t.lookbook, shots: t.shots, common: t.common }}
          />
        </main>
      </div>
    </>
  );
}
