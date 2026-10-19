"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAdmin, IconContacts, IconHome, IconLogo, IconProjects, IconSettings, IconTasks } from "./icons";

type Labels = { home: string; projects: string; tasks: string; contacts: string; settings: string; admin: string; main: string };

const ITEMS = [
  { href: "/", key: "home", Icon: IconHome },
  { href: "/projects", key: "projects", Icon: IconProjects },
  { href: "/tasks", key: "tasks", Icon: IconTasks },
  { href: "/contacts", key: "contacts", Icon: IconContacts },
  { href: "/settings", key: "settings", Icon: IconSettings },
] as const;

/** The narrow dark icon rail on the start edge of every signed-in page. */
export function Rail({ labels, isStaff = false }: { labels: Labels; isStaff?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav
      aria-label={labels.main}
      className="sticky top-0 flex h-dvh w-[70px] shrink-0 flex-col bg-rail max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:z-30 max-md:h-16 max-md:w-full max-md:flex-row"
    >
      <Link href="/" className="flex h-[60px] shrink-0 items-center justify-center bg-accent text-white max-md:hidden" aria-label="Studio M512">
        <IconLogo size={24} />
      </Link>
      {[...ITEMS, ...(isStaff ? ([{ href: "/admin", key: "admin", Icon: IconAdmin }] as const) : [])].map(({ href, key, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1.5 py-3.5 text-[11px] font-bold transition-colors max-md:flex-1 max-md:justify-center max-md:py-2 ${
              active ? "text-white" : "text-rail-muted hover:bg-rail-hover hover:text-white"
            }`}
          >
            <Icon />
            {labels[key]}
          </Link>
        );
      })}
    </nav>
  );
}
