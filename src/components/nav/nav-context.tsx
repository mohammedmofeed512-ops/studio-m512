"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { TOOL_AREA, type Levels } from "@/lib/permissions";

export type NavProject = { id: string; name: string; shared: boolean; levels: Levels };

/** Whether this person may open a project tool at all (view or edit). */
export function canOpenTool(project: NavProject | undefined, tool: string) {
  const area = TOOL_AREA[tool];
  return !area || !project || project.levels[area] >= 1;
}
type Nav = { projects: NavProject[]; t: Dictionary };

const NavContext = createContext<Nav | null>(null);

/** Shares the project list and labels with the sidebar, the quick-jump palette and loading screens. */
export function NavProvider({ projects, t, children }: Nav & { children: ReactNode }) {
  return <NavContext.Provider value={{ projects, t }}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav outside NavProvider");
  return nav;
}
