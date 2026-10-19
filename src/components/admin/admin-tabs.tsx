import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function AdminTabs({ active, t }: { active: "overview" | "plans"; t: Dictionary["admin"] }) {
  const tab = (key: "overview" | "plans", href: string, label: string) => (
    <Link href={href} aria-current={active === key ? "page" : undefined} className={`flex h-7 items-center rounded-[5px] px-3 text-[12px] font-bold ${active === key ? "bg-white shadow-sm" : "text-muted"}`}>
      {label}
    </Link>
  );
  return (
    <nav aria-label={t.title} className="flex rounded-md bg-[#F1F2F6] p-0.5">
      {tab("overview", "/admin", t.accounts)}
      {tab("plans", "/admin/plans", t.plans)}
    </nav>
  );
}
