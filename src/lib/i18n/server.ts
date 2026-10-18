import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, dictionaries, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  // Western digits in both languages, matching the design.
  const intlLocale = locale === "ar" ? "ar-u-nu-latn" : "en-GB";
  const formatDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) =>
    iso ? new Intl.DateTimeFormat(intlLocale, { timeZone: "UTC", ...opts }).format(new Date(iso)) : "";
  return { locale, dir, t: dictionaries[locale], formatDate, intlLocale } as const;
}
