"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** A timestamp in the viewer's own time zone (the server only knows UTC). */
export function LocalTime({ iso, locale }: { iso: string; locale: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)),
    () => "",
  );
  return (
    <time dateTime={iso} className="shrink-0 text-[11px] text-faint">
      {text}
    </time>
  );
}
