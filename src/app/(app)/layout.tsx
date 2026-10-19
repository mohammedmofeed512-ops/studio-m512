import { Rail } from "@/components/rail";
import { NavProvider } from "@/components/nav/nav-context";
import { CommandPalette } from "@/components/nav/command-palette";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/supabase/server";
import { FULL, normalizeLevels } from "@/lib/permissions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, userId } = await requireUser();
  const [{ t }, { data: projects }, { data: memberships }] = await Promise.all([
    getI18n(),
    supabase.from("projects").select("id, name, owner_id").neq("stage", "archived").order("updated_at", { ascending: false }).limit(200),
    supabase.from("project_members").select("project_id, permissions").eq("user_id", userId),
  ]);
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
        <Rail labels={t.nav} />
        <div className="flex min-w-0 flex-1 flex-col max-md:pb-16">{children}</div>
      </div>
      <CommandPalette />
    </NavProvider>
  );
}
