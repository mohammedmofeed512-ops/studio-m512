import Link from "next/link";
import type { Metadata } from "next";
import { IconLogo } from "@/components/icons";
import { signOut } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { AREAS, normalizeLevels, type Role } from "@/lib/permissions";
import { fill } from "@/lib/production/schedule";
import { AcceptButton } from "./accept-button";

export const metadata: Metadata = { title: "Invitation", robots: { index: false, follow: false } };

type Preview = { project: string; inviter: string; email: string; role: string; permissions: unknown; expired: boolean; accepted: boolean };

/** Where an invited person lands: see the project and their access, then accept. */
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [{ t }, supabase] = await Promise.all([getI18n(), createClient()]);
  const valid = /^[0-9a-f]{48}$/.test(token);
  const [{ data }, { data: claims }] = await Promise.all([
    valid ? supabase.rpc("invitation_preview", { p_token: token }) : Promise.resolve({ data: null }),
    supabase.auth.getClaims(),
  ]);
  const inv = data as unknown as Preview | null;
  const myEmail = (claims?.claims?.email as string | undefined) ?? null;
  const i = t.invite;
  const levels = normalizeLevels(inv?.permissions);
  const next = `/invite/${token}`;

  let body;
  if (!inv) body = <p className="text-center text-muted">{i.invalid}</p>;
  else if (inv.expired && !inv.accepted) body = <p className="text-center text-muted">{i.expired}</p>;
  else
    body = (
      <>
        <h1 className="text-center text-[20px] font-extrabold">{i.title}</h1>
        <p className="mt-2 text-center leading-relaxed text-body">{fill(i.body, { inviter: inv.inviter || "Studio M512", project: inv.project })}</p>
        <p className="mt-4 text-center text-[12px] text-muted">
          {i.forEmail}{" "}
          <span dir="ltr" className="font-bold text-ink">
            {inv.email}
          </span>
        </p>
        <div className="mt-5 rounded-lg bg-ground px-4 py-3">
          <p className="mb-2 text-[11px] font-bold text-muted">
            {i.yourAccess} · {t.roles[inv.role as Role] ?? inv.role}
          </p>
          <ul className="grid gap-1 text-[12px]">
            {AREAS.filter((a) => levels[a] > 0).map((a) => (
              <li key={a} className="flex justify-between gap-3">
                <span>{t.areas[a]}</span>
                <span className={`font-bold ${levels[a] === 2 ? "text-accent-ink" : "text-muted"}`}>{levels[a] === 2 ? t.team.edit : t.team.view}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">
          {!myEmail ? (
            <div className="flex flex-col gap-2">
              <Link href={`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(inv.email)}`} className="btn-primary h-11 text-[14px]">
                {i.signIn}
              </Link>
              <Link href={`/login?mode=up&next=${encodeURIComponent(next)}&email=${encodeURIComponent(inv.email)}`} className="btn-ghost h-11 border border-line">
                {i.signUp}
              </Link>
            </div>
          ) : myEmail.toLowerCase() !== inv.email.toLowerCase() ? (
            <div className="text-center">
              <p className="text-[12px] font-bold text-warn">{fill(i.wrongEmail, { current: myEmail, email: inv.email })}</p>
              <form action={signOut} className="mt-3">
                <button className="btn-ghost border border-line">{i.switchAccount}</button>
              </form>
            </div>
          ) : (
            <AcceptButton token={token} label={i.accept} errors={{ invalid: i.invalid, expired: i.expired, used: i.used, email: fill(i.wrongEmail, { current: myEmail, email: inv.email }) }} />
          )}
        </div>
      </>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[60px] items-center gap-2.5 bg-white px-8 max-sm:px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <IconLogo size={18} />
        </span>
        <span dir="ltr" className="text-[16px] font-extrabold">
          Studio M512
        </span>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <section className="card w-full max-w-[440px] px-10 py-10 max-sm:px-6">{body}</section>
      </main>
    </div>
  );
}
