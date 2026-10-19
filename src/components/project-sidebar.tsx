"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PROJECT_TOOLS, projectFromPath, toolHref, type ProjectToolKey } from "@/lib/project-tools";
import { canOpenTool, useNav } from "./nav/nav-context";

/**
 * The project's tools as numbered workflow steps (Alt+1…5 jumps straight to a step),
 * a project switcher that keeps you on the same tool, and a "next step" link.
 * On phones it becomes a scrollable row of tabs.
 */
export function ProjectSidebar({ projectId }: { projectId: string }) {
  const { projects, t } = useNav();
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const active = projectFromPath(pathname)?.tool ?? "overview";
  const script = search.get("script");
  const p = t.projects;
  const label = (key: ProjectToolKey) => (key === "lookbook" ? p.lookbook : p[key]);
  const current = projects.find((x) => x.id === projectId);
  const allowed = (key: ProjectToolKey) => canOpenTool(current, key);
  const href = (key: ProjectToolKey, id = projectId) => toolHref(id, key, id === projectId ? script : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.code.replace("Digit", ""));
      const tool = PROJECT_TOOLS.find((x) => x.step === n && x.step <= 5);
      if (!e.code.startsWith("Digit") || !tool || !canOpenTool(current, tool.key)) return;
      e.preventDefault();
      router.push(toolHref(projectId, tool.key, script));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, router, script, current]);

  const steps = PROJECT_TOOLS.filter((x) => x.step >= 1 && x.step <= 5 && allowed(x.key));
  const activeStep = PROJECT_TOOLS.find((x) => x.key === active)?.step ?? 0;
  const next = steps.find((x) => x.step > activeStep);

  const item = (key: ProjectToolKey, step?: number) => (
    <Link
      key={key}
      href={href(key)}
      aria-current={active === key ? "page" : undefined}
      title={step !== undefined ? `Alt+${step}` : undefined}
      className="pill-nav group shrink-0 gap-2.5 max-md:h-9 max-md:bg-ground max-md:px-3.5 max-md:aria-[current=page]:bg-tint"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {step ? (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ground text-[10px] font-extrabold text-muted group-aria-[current=page]:bg-accent group-aria-[current=page]:text-white max-md:hidden">
            {step}
          </span>
        ) : null}
        <span className="truncate">{label(key)}</span>
      </span>
      {step !== undefined ? <kbd className="text-[10px] font-semibold text-faint opacity-0 group-hover:opacity-100 max-md:hidden">Alt {step}</kbd> : null}
    </Link>
  );

  return (
    <aside aria-label={p.tools} className="w-[250px] shrink-0 border-e border-line bg-white max-md:w-full max-md:border-e-0 max-md:border-b">
      <div className="sticky top-0 flex max-h-dvh flex-col gap-0.5 overflow-y-auto px-3 py-4 max-md:static max-md:max-h-none max-md:flex-row max-md:gap-1.5 max-md:overflow-x-auto max-md:py-2">
      {projects.length > 1 ? (
        <details className="relative mb-2 max-md:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-line px-3 font-bold [&::-webkit-details-marker]:hidden">
            <span className="truncate">{current?.name ?? p.title}</span>
            <span aria-hidden className="text-[10px] text-faint">▼</span>
          </summary>
          <div className="absolute inset-x-0 top-11 z-30 max-h-72 overflow-y-auto rounded-[10px] border border-line bg-white p-1.5 shadow-lg">
            <div className="px-2.5 py-1.5 text-[11px] font-bold text-faint">{t.flow.switchProject}</div>
            {projects.map((x) => (
              <Link
                key={x.id}
                href={href(active, x.id)}
                aria-current={x.id === projectId ? "true" : undefined}
                className="block truncate rounded-md px-2.5 py-2 font-semibold hover:bg-ground aria-[current=true]:text-accent-ink"
              >
                {x.name}
                {x.shared ? <span className="ms-2 text-[10px] font-bold text-faint">{t.team.shared}</span> : null}
              </Link>
            ))}
          </div>
        </details>
      ) : null}

      {item("overview", 0)}
      {item("team")}
      <div className="mx-3 mb-1.5 mt-3.5 text-[11px] font-bold text-faint max-md:hidden">{t.flow.steps}</div>
      {steps.map((x) => item(x.key, x.step))}

      <div className="mx-3 mb-1.5 mt-3.5 text-[11px] font-bold text-faint max-md:hidden">{p.resources}</div>
      {allowed("lookbook") ? item("lookbook") : null}
      <Link href="/contacts" className="pill-nav shrink-0 max-md:h-9 max-md:bg-ground max-md:px-3.5">
        {t.nav.contacts}
      </Link>
      <Link href="/contacts?kind=location" className="pill-nav shrink-0 max-md:h-9 max-md:bg-ground max-md:px-3.5">
        {p.locations}
      </Link>

      {next ? (
        <Link href={href(next.key)} className="mt-4 rounded-[10px] bg-tint px-3.5 py-3 hover:bg-accent/15 max-md:hidden">
          <span className="block text-[11px] font-bold text-muted">{t.flow.next}</span>
          <span className="mt-0.5 flex items-center justify-between font-bold text-accent-ink">
            {next.step}. {label(next.key)}
            <span aria-hidden className="rtl:rotate-180">→</span>
          </span>
        </Link>
      ) : null}
      </div>
    </aside>
  );
}
