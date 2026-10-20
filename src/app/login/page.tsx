import type { Metadata } from "next";
import { IconLogo } from "@/components/icons";
import { setLocale } from "@/lib/actions";
import { getI18n } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const email = typeof sp.email === "string" ? sp.email.slice(0, 320) : "";
  const startMode = sp.mode === "up" ? "up" : "in";
  const linkError = sp.error === "link";
  const { t, locale } = await getI18n();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[60px] items-center justify-between bg-white px-8 max-sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
            <IconLogo size={18} />
          </span>
          <span dir="ltr" className="text-[16px] font-extrabold">
            Studio M512
          </span>
        </div>
        <form action={setLocale}>
          <input type="hidden" name="locale" value={other} />
          <button className="btn-soft">{other === "en" ? "English" : "العربية"}</button>
        </form>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <section className="card w-full max-w-[420px] px-10 py-10 max-sm:px-6">
          <div className="mb-5 flex justify-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-tint text-accent">
              <IconLogo size={28} />
            </span>
          </div>
          <LoginForm t={t.login} next={next} email={email} startMode={startMode} linkError={linkError} />
        </section>
      </main>
    </div>
  );
}
