"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type NavProject = { id: string; name: string };
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
