"use client";

import { useState, useTransition } from "react";
import { inviteMember, removeMember, revokeInvitation, updateMember } from "@/lib/team-actions";
import { ROLES, ROLE_PRESETS, normalizeLevels, roleFor, type Levels, type Role } from "@/lib/permissions";
import { fill, whatsappLink } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LevelsMatrix } from "./levels-matrix";

type Labels = Pick<Dictionary, "team" | "areas" | "roles" | "common" | "plan">;
export type MemberRow = { userId: string; name: string; role: string; permissions: unknown; isYou: boolean };
export type InvitationRow = { id: string; email: string; role: string; token: string; expiresAt: string; expired: boolean };

const presetFor = (role: Role): Levels => (role === "custom" ? ROLE_PRESETS.viewer : ROLE_PRESETS[role]);

function InviteLink({ token, email, projectName, t }: { token: string; email: string; projectName: string; t: Labels }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/invite/${token}` : `${window.location.origin}/invite/${token}`;
  const text = `${fill(t.team.message, { project: projectName })}\n${url}`;
  return (
    <div className="flex flex-wrap gap-1">
      <a href={whatsappLink(null, text)} target="_blank" rel="noreferrer" className="btn h-8 bg-[#E7F7EE] px-2.5 text-[#11743F] hover:bg-[#D4F0E0]">
        {t.team.whatsapp}
      </a>
      <a href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(projectName)}&body=${encodeURIComponent(text)}`} className="btn-soft h-8 px-2.5">
        {t.team.emailSend}
      </a>
      <button
        type="button"
        className="btn-ghost h-8 border border-line px-2.5"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? t.team.copied : t.team.copy}
      </button>
    </div>
  );
}

function MemberEditor({ projectId, member, canManage, t }: { projectId: string; member: MemberRow; canManage: boolean; t: Labels }) {
  const [levels, setLevels] = useState<Levels>(() => normalizeLevels(member.permissions));
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const role = roleFor(levels);
  return (
    <li className="border-b border-line px-6 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-tint text-[12px] font-bold text-accent-ink">{member.name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">
            {member.name} {member.isYou ? <span className="font-semibold text-muted">({t.team.you})</span> : null}
          </span>
          <span className="text-[12px] text-muted">{t.roles[role]}</span>
        </span>
        {canManage ? (
          <button type="button" className="btn-ghost h-8 border border-line" aria-expanded={open} onClick={() => setOpen(!open)}>
            {t.team.editAccess}
          </button>
        ) : null}
        {canManage || member.isYou ? (
          <button
            type="button"
            className="btn-danger h-8 px-2.5"
            disabled={pending}
            onClick={() => window.confirm(member.isYou ? t.team.leaveConfirm : t.team.removeConfirm) && start(() => removeMember(projectId, member.userId))}
          >
            {member.isYou ? t.team.leave : t.team.remove}
          </button>
        ) : null}
      </div>
      {open && canManage ? (
        <div className="mt-3 rounded-lg bg-ground/60 p-4">
          <label className="mb-3 block">
            <span className="label">{t.team.role}</span>
            <select className="field h-9" value={role} onChange={(e) => setLevels(presetFor(e.target.value as Role))}>
              {ROLES.map((r) => (
                <option key={r} value={r} disabled={r === "custom"}>
                  {t.roles[r]}
                </option>
              ))}
            </select>
          </label>
          <LevelsMatrix levels={levels} onChange={setLevels} t={t} idPrefix={`m-${member.userId}`} />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await updateMember({ projectId, userId: member.userId, permissions: levels });
                  setStatus(r.ok ? t.team.saved : t.team.failed);
                })
              }
            >
              {t.team.save}
            </button>
            <span role="status" className="text-[12px] font-semibold text-muted">
              {status}
            </span>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function TeamManager({
  projectId,
  projectName,
  owner,
  members,
  invitations,
  canManage,
  t,
}: {
  projectId: string;
  projectName: string;
  owner: { name: string; isYou: boolean };
  members: MemberRow[];
  invitations: InvitationRow[];
  canManage: boolean;
  t: Labels;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("director");
  const [levels, setLevels] = useState<Levels>(ROLE_PRESETS.director);
  const [result, setResult] = useState<{ token: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] content-start gap-3 max-sm:grid-cols-1">
      <section aria-labelledby="members-h" className="card self-start overflow-hidden">
        <div className="card-head">
          <h2 id="members-h" className="card-title">
            {t.team.members}
          </h2>
          <span className="text-[12px] text-muted">{members.length + 1}</span>
        </div>
        <ul>
          <li className="flex items-center gap-3 border-b border-line px-6 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">{owner.name.slice(0, 1)}</span>
            <span className="flex-1">
              <span className="block font-bold">
                {owner.name} {owner.isYou ? <span className="font-semibold text-muted">({t.team.you})</span> : null}
              </span>
              <span className="text-[12px] text-muted">{t.team.owner}</span>
            </span>
          </li>
          {members.map((m) => (
            <MemberEditor key={m.userId} projectId={projectId} member={m} canManage={canManage && !m.isYou} t={t} />
          ))}
        </ul>
        {!members.length ? <p className="px-6 py-6 text-center text-muted">{t.team.noMembers}</p> : null}
      </section>

      {canManage ? (
        <div className="flex flex-col gap-3">
          <section aria-labelledby="invite-h" className="card overflow-hidden">
            <div className="card-head">
              <h2 id="invite-h" className="card-title">
                {t.team.invite}
              </h2>
            </div>
            <form
              className="flex flex-col gap-3 p-6"
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                start(async () => {
                  const r = await inviteMember({ projectId, email, role, permissions: levels });
                  if (r.ok) {
                    setResult({ token: r.token, email });
                    setEmail("");
                  } else setError(r.error === "email" ? t.team.invalidEmail : r.error === "limit" ? t.plan.limitMembers : t.team.failed);
                });
              }}
            >
              <p className="text-[12px] leading-relaxed text-muted">{t.team.inviteHint}</p>
              <label>
                <span className="label">{t.team.email}</span>
                <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="field text-start" autoComplete="off" />
              </label>
              <label>
                <span className="label">{t.team.role}</span>
                <select
                  className="field"
                  value={role}
                  onChange={(e) => {
                    const r = e.target.value as Role;
                    setRole(r);
                    setLevels(presetFor(r));
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t.roles[r]}
                    </option>
                  ))}
                </select>
              </label>
              <LevelsMatrix
                levels={levels}
                onChange={(next) => {
                  setLevels(next);
                  setRole(roleFor(next));
                }}
                t={t}
                idPrefix="invite"
              />
              <button className="btn-primary self-start" disabled={pending}>
                {t.team.send}
              </button>
              {error ? (
                <p role="alert" className="text-[12px] font-bold text-warn">
                  {error}
                </p>
              ) : null}
              {result ? (
                <div role="status" className="rounded-lg bg-ok-tint p-4">
                  <p className="mb-2 text-[12px] font-bold text-ok">{t.team.linkReady}</p>
                  <InviteLink token={result.token} email={result.email} projectName={projectName} t={t} />
                </div>
              ) : null}
            </form>
          </section>

          {invitations.length ? (
            <section aria-labelledby="pending-h" className="card overflow-hidden">
              <div className="card-head">
                <h2 id="pending-h" className="card-title">
                  {t.team.pending}
                </h2>
              </div>
              <ul>
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-3 last:border-b-0">
                    <span className="min-w-[160px] flex-1">
                      <span className="block font-bold" dir="ltr">
                        {inv.email}
                      </span>
                      <span className="text-[12px] text-muted">
                        {t.roles[inv.role as Role] ?? inv.role} · {inv.expired ? t.team.expired : `${t.team.expires} ${inv.expiresAt}`}
                      </span>
                    </span>
                    {!inv.expired ? <InviteLink token={inv.token} email={inv.email} projectName={projectName} t={t} /> : null}
                    <button type="button" className="btn-danger h-8 px-2.5" disabled={pending} onClick={() => start(() => revokeInvitation(projectId, inv.id))}>
                      {t.team.revoke}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="card self-start px-6 py-5 text-[12px] text-muted">{t.team.managersOnly}</p>
      )}
    </div>
  );
}
