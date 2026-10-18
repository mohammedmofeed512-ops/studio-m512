import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";
import { ConfirmButton } from "@/components/confirm-button";
import { IconContacts } from "@/components/icons";
import { deleteContact } from "@/lib/actions";
import { CONTACT_KINDS, type ContactKind } from "@/lib/database.types";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const kindParam = (await searchParams).kind;
  const kind = (CONTACT_KINDS as readonly string[]).includes(String(kindParam)) ? (kindParam as ContactKind) : null;
  const [{ t }, { supabase }] = await Promise.all([getI18n(), getViewer()]);

  const { data: contacts } = await supabase.from("contacts").select("*").order("full_name");
  const all = contacts ?? [];
  const shown = kind ? all.filter((c) => c.kind === kind) : all;
  const count = (k: ContactKind) => all.filter((c) => c.kind === k).length;

  return (
    <>
      <PageHeader crumbs={t.contacts.title} />
      <SubToolbar icon={<IconContacts size={14} />} title={kind ? t.contactKinds[kind] : t.contacts.title} meta={`${shown.length}`} />

      <div className="flex flex-1 flex-wrap">
        <aside className="flex w-[250px] shrink-0 flex-col gap-0.5 border-e border-line bg-white px-3 py-4 max-md:w-full max-md:flex-row max-md:flex-wrap max-md:border-e-0 max-md:border-b">
          <Link href="/contacts" aria-current={!kind ? "page" : undefined} className="pill-nav">
            {t.contacts.all}
            <span className="text-[11px]">{all.length}</span>
          </Link>
          <div className="mx-3 mb-1.5 mt-3.5 text-[11px] font-bold text-faint max-md:hidden">{t.contacts.kind}</div>
          {CONTACT_KINDS.map((k) => (
            <Link key={k} href={`/contacts?kind=${k}`} aria-current={kind === k ? "page" : undefined} className="pill-nav">
              {t.contactKinds[k]}
              <span className="text-[11px]">{count(k)}</span>
            </Link>
          ))}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-3 p-6 max-sm:p-4">
          <section aria-label={t.contacts.new} className="card px-5 py-4">
            <ContactForm t={t} defaultKind={kind ?? undefined} />
          </section>

          <section className="card overflow-hidden">
            {shown.length ? (
              <div className="overflow-x-auto px-4">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr>
                      <th className="th">{t.contacts.name}</th>
                      <th className="th">{t.contacts.kind}</th>
                      <th className="th">{t.contacts.role}</th>
                      <th className="th">{t.contacts.phone}</th>
                      <th className="th">{t.contacts.email}</th>
                      <th className="th">
                        <span className="sr-only">{t.common.delete}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c) => (
                      <tr key={c.id}>
                        <td className="td font-bold">{c.full_name}</td>
                        <td className="td">{t.contactKinds[c.kind]}</td>
                        <td className="td">{c.role ?? t.common.none}</td>
                        <td className="td" dir="ltr" style={{ textAlign: "start" }}>
                          {c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : t.common.none}
                        </td>
                        <td className="td" dir="ltr" style={{ textAlign: "start" }}>
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="text-accent-ink">
                              {c.email}
                            </a>
                          ) : (
                            t.common.none
                          )}
                        </td>
                        <td className="td text-end">
                          <form action={deleteContact}>
                            <input type="hidden" name="id" value={c.id} />
                            <ConfirmButton className="btn-ghost h-7 px-2 text-[11px]" message={`${t.common.delete}: ${c.full_name}?`}>
                              {t.common.delete}
                            </ConfirmButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-16 text-center text-muted">{t.contacts.empty}</p>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
