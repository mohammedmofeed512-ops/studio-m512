import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PageHeader } from "./page-header";
import { ProjectSidebar } from "./project-sidebar";

/** Shown instead of a tool the member may not open. */
export function NoAccess({ t }: { t: Dictionary }) {
  return (
    <main className="min-w-0 flex-1 p-6 max-sm:p-4">
      <div className="card px-6 py-14 text-center text-muted">{t.team.noAccess}</div>
    </main>
  );
}

/** A whole page for a tool the member may not open, keeping the project navigation. */
export function NoAccessPage({ projectId, projectName, title, t }: { projectId: string; projectName: string; title: string; t: Dictionary }) {
  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href={`/projects/${projectId}`} className="text-muted hover:text-ink">
              {projectName}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {title}
          </>
        }
      />
      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={projectId} />
        <NoAccess t={t} />
      </div>
    </>
  );
}

/** A thin notice above a tool the member may only view. */
export function ReadOnlyBanner({ t }: { t: Dictionary }) {
  return <div className="no-print bg-warn-tint px-6 py-2 text-[12px] font-bold text-warn">{t.team.readOnly}</div>;
}

/** Disables every control inside for view-only members (the database refuses their writes anyway). */
export function EditGate({ editable, children }: { editable: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={!editable} className="contents">
      {children}
    </fieldset>
  );
}
