import { Rail } from "@/components/rail";
import { NavProvider } from "@/components/nav/nav-context";
import { CommandPalette } from "@/components/nav/command-palette";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/supabase/server";
import { FULL, normalizeLevels } from "@/lib/permissions";
import { getPlan } from "@/lib/viewer";
import { signOut } from "@/lib/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, userId } = await requireUser();
  const [{ t }, { data: projects }, { data: memberships }, plan] = await Promise.all([
    getI18n(),
    supabase.from("projects").select("id, name, owner_id").neq("stage", "archived").order("updated_at", { ascending: false }).limit(200),
    supabase.from("project_members").select("project_id, permissions").eq("user_id", userId),
    getPlan(),
  ]);
  if (plan.suspended) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <section className="card max-w-md px-8 py-10 text-center">
          <h1 className="text-[18px] font-extrabold">{t.plan.suspendedTitle}</h1>
          <p className="mt-2 leading-relaxed text-body">{t.plan.suspendedBody}</p>
          <form action={signOut} className="mt-5">
            <button className="btn-soft">{t.common.signOut}</button>
          </form>
        </section>
      </main>
    );
  }
  const perms = new Map((memberships ?? []).map((m) => [m.project_id, m.permissions]));
  const navProjects = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    shared: p.owner_id !== userId,
    levels: p.owner_id === userId ? { ...FULL } : normalizeLevels(perms.get(p.id)),
  }));
  return (
    <NavProvider projects={navProjects} t={t}>
      <div className="flex min-h-dvh">
        <Rail labels={t.nav} isStaff={plan.role !== "user"} />
        <div className="flex min-w-0 flex-1 flex-col max-md:pb-16">{children}</div>
      </div>
      <CommandPalette />
    </NavProvider>
  );
}
