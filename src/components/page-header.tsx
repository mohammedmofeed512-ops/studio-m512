import type { ReactNode } from "react";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { Topbar } from "./topbar";
import { NotificationBell } from "./notification-bell";

export async function PageHeader({ crumbs }: { crumbs: ReactNode }) {
  const [{ locale, t }, viewer] = await Promise.all([getI18n(), getViewer()]);
  const { data } = await viewer.supabase
    .from("notifications")
    .select("id, kind, data, link, read_at, created_at")
    .eq("user_id", viewer.userId)
    .order("created_at", { ascending: false })
    .limit(15);
  const bell = (
    <NotificationBell
      locale={locale}
      t={t.notifications}
      items={(data ?? []).map((n) => ({ id: n.id, kind: n.kind, data: (n.data ?? {}) as Record<string, string | null>, link: n.link, read: Boolean(n.read_at), createdAt: n.created_at }))}
    />
  );
  return <Topbar crumbs={crumbs} locale={locale} userName={viewer.name} company={viewer.company} signOutLabel={t.common.signOut} paletteLabel={t.palette.open} bell={bell} />;
}

/** The second white bar under the top bar: tinted icon, page title, actions. */
export function SubToolbar({ icon, title, meta, children }: { icon: ReactNode; title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2.5 bg-white px-6 py-2 shadow-[0_1px_0_var(--color-line)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-tint text-accent">{icon}</span>
        <h1 className="truncate text-[14px] font-bold">{title}</h1>
        {meta ? <span className="text-[12px] text-muted">{meta}</span> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
