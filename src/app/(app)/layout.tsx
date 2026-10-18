import { Rail } from "@/components/rail";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh">
      <Rail labels={t.nav} />
      <div className="flex min-w-0 flex-1 flex-col max-md:pb-16">{children}</div>
    </div>
  );
}
