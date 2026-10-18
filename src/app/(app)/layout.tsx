import { Rail } from "@/components/rail";
import { NavProvider } from "@/components/nav/nav-context";
import { CommandPalette } from "@/components/nav/command-palette";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase } = await requireUser();
  const [{ t }, { data: projects }] = await Promise.all([
    getI18n(),
    supabase.from("projects").select("id, name").neq("stage", "archived").order("updated_at", { ascending: false }).limit(200),
  ]);
  return (
    <NavProvider projects={projects ?? []} t={t}>
      <div className="flex min-h-dvh">
        <Rail labels={t.nav} />
        <div className="flex min-w-0 flex-1 flex-col max-md:pb-16">{children}</div>
      </div>
      <CommandPalette />
    </NavProvider>
  );
}
