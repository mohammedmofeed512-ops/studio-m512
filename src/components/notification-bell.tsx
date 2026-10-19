"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markNotificationsRead } from "@/lib/notification-actions";
import { fill } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type NotificationItem = { id: string; kind: string; data: Record<string, string | null>; link: string | null; read: boolean; createdAt: string };

function text(n: NotificationItem, t: Dictionary["notifications"], locale: "ar" | "en") {
  const d = n.data;
  const date = d.expires_at
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d.expires_at))
    : "";
  const vars = {
    plan: (locale === "ar" ? d.plan_ar : d.plan_en) ?? "",
    until: date ? fill(t.until, { date }) : "",
    name: d.name || t.someone,
    project: d.project ?? "",
  };
  const template = (t as Record<string, string>)[n.kind];
  return template ? fill(template, vars) : n.kind;
}

/** The bell in the top bar: unread count, latest notifications, marks them read when opened. */
export function NotificationBell({ items, t, locale }: { items: NotificationItem[]; t: Dictionary["notifications"]; locale: "ar" | "en" }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(items.filter((n) => !n.read).length);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`${t.title}${unread ? ` (${unread})` : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open && unread) {
            setUnread(0);
            void markNotificationsRead();
          }
        }}
        className="relative flex size-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-ground hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread ? (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[10px] font-bold text-white">{unread}</span>
        ) : null}
      </button>
      {open ? (
        <div role="dialog" aria-label={t.title} className="absolute end-0 top-11 z-40 w-[330px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[10px] border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-3 font-extrabold">{t.title}</div>
          {items.length ? (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((n) => {
                const body = (
                  <>
                    <span className="block leading-relaxed">{text(n, t, locale)}</span>
                    <span className="mt-0.5 block text-[11px] text-faint">{fmt.format(new Date(n.createdAt))}</span>
                  </>
                );
                return (
                  <li key={n.id} className={`border-b border-line last:border-b-0 ${n.read ? "" : "bg-tint/50"}`}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)} className="block px-4 py-3 text-[13px] hover:bg-ground">
                        {body}
                      </Link>
                    ) : (
                      <div className="px-4 py-3 text-[13px]">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-[12px] text-muted">{t.empty}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
