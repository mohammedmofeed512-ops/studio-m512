"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROJECT_TOOLS, matchesSearch, projectFromPath, toolHref } from "@/lib/project-tools";
import { canOpenTool, useNav } from "./nav-context";

type Item = { id: string; label: string; detail?: string; href: string; group: string; minor?: boolean };

export const OPEN_PALETTE = "studio:palette";

/** Ctrl/⌘+K: jump to any project, any project tool or any page by typing a few letters. */
export function CommandPalette() {
  const { projects, t } = useNav();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setIndex(0);
        setOpen((v) => !v);
      }
    };
    const onOpen = () => {
      setQuery("");
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE, onOpen);
    };
  }, []);


  const items = useMemo(() => {
    const p = t.projects;
    const toolLabel = (key: (typeof PROJECT_TOOLS)[number]["key"]) => (key === "lookbook" ? p.lookbook : key === "team" ? p.team : p[key]);
    const here = projectFromPath(pathname)?.projectId;
    const out: Item[] = [];
    const current = projects.find((x) => x.id === here);
    if (current) {
      for (const tool of PROJECT_TOOLS.filter((x) => canOpenTool(current, x.key)))
        out.push({ id: `h-${tool.key}`, label: toolLabel(tool.key), detail: current.name, href: toolHref(current.id, tool.key), group: t.palette.thisProject });
    }
    const pages: Array<[string, string]> = [
      ["/", t.nav.home],
      ["/projects", t.nav.projects],
      ["/projects/new", t.palette.newProject],
      ["/tasks", t.nav.tasks],
      ["/contacts", t.nav.contacts],
      ["/settings", t.nav.settings],
    ];
    for (const [href, label] of pages) out.push({ id: `p-${href}`, label, href, group: t.palette.pages });
    for (const proj of projects) {
      if (proj.id === here) continue;
      out.push({ id: `o-${proj.id}`, label: proj.name, href: `/projects/${proj.id}`, group: t.palette.otherProjects });
      for (const tool of PROJECT_TOOLS.slice(1).filter((x) => canOpenTool(proj, x.key)))
        out.push({ id: `o-${proj.id}-${tool.key}`, label: `${proj.name} · ${toolLabel(tool.key)}`, href: toolHref(proj.id, tool.key), group: t.palette.otherProjects, minor: true });
    }
    return out;
  }, [projects, t, pathname]);

  const results = useMemo(() => {
    // Without a query, other projects' individual tools are hidden to keep the list short.
    const base = query.trim() ? items : items.filter((x) => !x.minor);
    return base.filter((x) => matchesSearch(`${x.label} ${x.detail ?? ""}`, query)).slice(0, 60);
  }, [items, query]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-rail/40 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.palette.open}
        className="w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[index]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t.palette.placeholder}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[index] ? `pal-${index}` : undefined}
          className="h-14 w-full border-b border-line px-5 text-[15px] outline-none"
        />
        <ul ref={list} id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length ? (
            results.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <li key={item.id} role="presentation">
                  {header ? <div className="px-3 pb-1 pt-2.5 text-[11px] font-bold text-faint">{header}</div> : null}
                  <button
                    id={`pal-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === index}
                    type="button"
                    onMouseMove={() => setIndex(i)}
                    onClick={() => go(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-start aria-selected:bg-tint aria-selected:text-accent-ink"
                  >
                    <span className="truncate font-semibold">{item.label}</span>
                    {item.detail ? <span className="truncate text-[12px] text-muted">{item.detail}</span> : null}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-8 text-center text-muted">{t.palette.noResults}</li>
          )}
        </ul>
        <div className="border-t border-line px-5 py-2.5 text-[11px] text-faint">{t.palette.hint}</div>
      </div>
    </div>
  );
}

export function PaletteButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))}
      className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[12px] font-semibold text-muted hover:bg-ground hover:text-ink"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="max-sm:hidden">{label}</span>
      <kbd dir="ltr" className="rounded bg-ground px-1.5 py-0.5 text-[10px] font-bold max-sm:hidden">
        Ctrl K
      </kbd>
    </button>
  );
}
