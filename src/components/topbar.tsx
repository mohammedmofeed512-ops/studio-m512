import type { ReactNode } from "react";
import { setLocale, signOut } from "@/lib/actions";
import type { Locale } from "@/lib/i18n/dictionaries";
import { PaletteButton } from "./nav/command-palette";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "M";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** White 60px bar: breadcrumb at the start, language switch and account at the end. */
export function Topbar({
  crumbs,
  locale,
  userName,
  company,
  signOutLabel,
  paletteLabel,
}: {
  crumbs: ReactNode;
  locale: Locale;
  userName: string;
  company: string;
  signOutLabel: string;
  paletteLabel: string;
}) {
  const other: Locale = locale === "ar" ? "en" : "ar";
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
      <div className="min-w-0 truncate text-[13px] font-semibold">{crumbs}</div>
      <div className="flex items-center gap-2.5">
        <PaletteButton label={paletteLabel} />
        <form action={setLocale}>
          <input type="hidden" name="locale" value={other} />
          <button className="btn-soft" aria-label={other === "en" ? "Switch to English" : "التبديل إلى العربية"}>
            {other === "en" ? "EN" : "ع"}
          </button>
        </form>
        <details className="relative">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-line ps-2.5 pe-1.5 [&::-webkit-details-marker]:hidden">
            <span dir="ltr" className="text-[12px] font-bold max-sm:hidden">
              {company}
            </span>
            <span className="flex size-[26px] items-center justify-center rounded-full bg-[#7b4ddb] text-[11px] font-bold text-white">
              {initials(userName)}
            </span>
          </summary>
          <div className="absolute end-0 top-11 z-20 w-56 rounded-[10px] border border-line bg-white p-2 shadow-lg">
            <div className="truncate px-2.5 py-2 font-bold">{userName}</div>
            <form action={signOut}>
              <button className="btn-ghost w-full justify-start">{signOutLabel}</button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
