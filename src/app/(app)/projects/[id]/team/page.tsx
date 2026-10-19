import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProjectSidebar } from "@/components/project-sidebar";
import { IconContacts } from "@/components/icons";
import { TeamManager } from "@/components/team/team-manager";
import { getAccess } from "@/lib/access";
import { canEdit, isPast } from "@/lib/permissions";
import { isUuid } from "@/lib/production/load";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: PageProps<"/projects/[id]/team">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [{ t, formatDate }, { supabase, userId }, access] = await Promise.all([getI18n(), getViewer(), getAccess(id)]);
  if (!access) notFound();
  const canManage = canEdit(access, "team");

  const [{ data: project }, { data: members }, { data: invitations }] = await Promise.all([
    supabase.from("projects").select("id, name, owner_id").eq("id", id).maybeSingle(),
    supabase.from("project_members").select("user_id, role, permissions, created_at").eq("project_id", id).order("created_at"),
    canManage
      ? supabase.from("project_invitations").select("id, email, role, token, expires_at").eq("project_id", id).is("accepted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: string; email: string; role: string; token: string; expires_at: string }> }),
  ]);
  if (!project) notFound();
  const ids = [project.owner_id, ...(members ?? []).map((m) => m.user_id)];
  const { data: people } = await supabase.from("profiles").select("id, full_name, company_name").in("id", ids);
  const nameOf = (uid: string) => {
    const p = people?.find((x) => x.id === uid);
    return p?.full_name || p?.company_name || "—";
  };

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link href={`/projects/${id}`} className="text-muted hover:text-ink">
              {project.name}
            </Link>
            <span className="mx-1.5 text-rail-muted">/</span>
            {t.team.title}
          </>
        }
      />
      <SubToolbar icon={<IconContacts size={14} />} title={t.team.title} meta={`${(members?.length ?? 0) + 1}`} />
      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={id} />
        <main className="min-w-0 flex-1 p-6 max-sm:p-3">
          <TeamManager
            projectId={id}
            projectName={project.name}
            owner={{ name: nameOf(project.owner_id), isYou: project.owner_id === userId }}
            members={(members ?? []).map((m) => ({ userId: m.user_id, name: nameOf(m.user_id), role: m.role, permissions: m.permissions, isYou: m.user_id === userId }))}
            invitations={(invitations ?? []).map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              token: i.token,
              expiresAt: formatDate(i.expires_at, { day: "numeric", month: "short" }),
              expired: isPast(i.expires_at),
            }))}
            canManage={canManage}
            t={{ team: t.team, areas: t.areas, roles: t.roles, common: t.common }}
          />
        </main>
      </div>
    </>
  );
}
