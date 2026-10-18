import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Tool = { key: string; label: string; href?: string; phase?: number };

/**
 * The light secondary sidebar listing a project's tools, like StudioBinder's.
 * Tools from later build phases show a phase badge until they exist.
 */
export function ProjectSidebar({ projectId, active, t }: { projectId: string; active: string; t: Dictionary }) {
  const p = t.projects;
  const tools: Tool[] = [
    { key: "overview", label: p.overview, href: `/projects/${projectId}` },
    { key: "script", label: p.script, href: `/projects/${projectId}/scripts` },
    { key: "breakdown", label: p.breakdown, phase: 3 },
    { key: "shots", label: p.shots, phase: 3 },
    { key: "schedule", label: p.schedule, phase: 4 },
    { key: "callSheets", label: p.callSheets, phase: 4 },
  ];
  const resources: Tool[] = [
    { key: "contacts", label: t.nav.contacts, href: "/contacts" },
    { key: "locations", label: p.locations, href: "/contacts?kind=location" },
    { key: "lookbook", label: p.lookbook, phase: 3 },
  ];

  const item = (tool: Tool) =>
    tool.href ? (
      <Link key={tool.key} href={tool.href} aria-current={active === tool.key ? "page" : undefined} className="pill-nav">
        {tool.label}
      </Link>
    ) : (
      <span key={tool.key} className="flex h-10 items-center justify-between rounded-full px-3 font-semibold text-faint" aria-disabled="true">
        {tool.label}
        <span className="badge bg-ground text-faint">
          {p.phase} {tool.phase}
        </span>
      </span>
    );

  return (
    <aside aria-label={p.tools} className="flex w-[250px] shrink-0 flex-col gap-0.5 border-e border-line bg-white px-3 py-4 max-md:w-full max-md:border-e-0 max-md:border-b">
      {tools.map(item)}
      <div className="mx-3 mb-1.5 mt-3.5 text-[11px] font-bold text-faint">{p.resources}</div>
      {resources.map(item)}
    </aside>
  );
}
