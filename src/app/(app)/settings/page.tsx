import type { Metadata } from "next";
import { PageHeader, SubToolbar } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { IconSettings } from "@/components/icons";
import { setLocale, signOut } from "@/lib/actions";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [{ t, locale }, viewer] = await Promise.all([getI18n(), getViewer()]);

  return (
    <>
      <PageHeader crumbs={t.settings.title} />
      <SubToolbar icon={<IconSettings size={14} />} title={t.settings.title} />
      <main className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] content-start gap-3 p-6 max-sm:grid-cols-1 max-sm:p-4">
        <section aria-labelledby="profile-h" className="card overflow-hidden">
          <div className="card-head">
            <h2 id="profile-h" className="card-title">
              {t.settings.profile}
            </h2>
          </div>
          <div className="p-6">
            <ProfileForm t={t} fullName={viewer.profile?.full_name ?? ""} company={viewer.company} />
          </div>
        </section>

        <section aria-labelledby="lang-h" className="card self-start overflow-hidden">
          <div className="card-head">
            <h2 id="lang-h" className="card-title">
              {t.settings.language}
            </h2>
          </div>
          <div className="flex gap-2 p-6">
            {(["ar", "en"] as const).map((l) => (
              <form key={l} action={setLocale}>
                <input type="hidden" name="locale" value={l} />
                <button aria-pressed={locale === l} className={locale === l ? "btn-primary" : "btn-soft"}>
                  {l === "ar" ? t.settings.arabic : t.settings.english}
                </button>
              </form>
            ))}
          </div>
          <div className="border-t border-line px-6 py-4">
            <div className="label">{t.settings.account}</div>
            <div className="mb-3" dir="ltr" style={{ textAlign: "start" }}>
              {viewer.email}
            </div>
            <form action={signOut}>
              <button className="btn-soft">{t.common.signOut}</button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
