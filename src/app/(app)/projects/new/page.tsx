import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { IconProjects } from "@/components/icons";
import { ProjectForm } from "@/components/project-form";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href="/projects" className="text-muted hover:text-ink">
              {t.projects.title}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {t.projects.new}
          </>
        }
      />
      <SubToolbar icon={<IconProjects size={14} />} title={t.projects.new} />
      <main className="p-6 max-sm:p-4">
        <section className="card mx-auto max-w-[640px] p-7 max-sm:p-5">
          <ProjectForm t={t} />
        </section>
      </main>
    </>
  );
}
