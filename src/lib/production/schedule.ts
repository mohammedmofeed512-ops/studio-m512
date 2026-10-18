/**
 * Shooting schedule helpers shared by the stripboard, call sheets and tests.
 */
import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];
export type StripScene = {
  id: string;
  scene_number: string;
  int_ext: Enums["int_ext"];
  location_name: string | null;
  day_night: Enums["day_night"];
  page_eighths: number;
  synopsis: string | null;
};

/** Industry strip colours: INT day white, EXT day yellow, INT night blue, EXT night green. */
export function stripColor(intExt: Enums["int_ext"], dayNight: Enums["day_night"]): { bg: string; edge: string } {
  const night = dayNight === "night";
  const ext = intExt !== "int";
  if (dayNight === "dawn" || dayNight === "dusk") return { bg: "#FCE4EC", edge: "#E59AB3" };
  if (night) return ext ? { bg: "#DDF3E2", edge: "#7CC594" } : { bg: "#DCE7FF", edge: "#8AA6F0" };
  return ext ? { bg: "#FFF4B8", edge: "#E3CB4F" } : { bg: "#FFFFFF", edge: "#D5D8E2" };
}

export const sumEighths = (scenes: Array<{ page_eighths: number }>) => scenes.reduce((n, s) => n + (s.page_eighths || 0), 0);

const DN_ORDER: Record<Enums["day_night"], number> = { dawn: 0, day: 1, continuous: 2, dusk: 3, night: 4 };
const placeKey = (s: StripScene) => (s.location_name ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Groups scenes into shoot days: same location together (largest locations first),
 * day before night, then fills each day up to `pagesPerDay`. A scene longer than a
 * whole day gets a day of its own. Returns scene ids per day.
 */
export function planDays(scenes: StripScene[], pagesPerDay: number): string[][] {
  const limit = Math.max(1, Math.round(pagesPerDay * 8));
  const groups = new Map<string, StripScene[]>();
  for (const s of scenes) {
    const k = placeKey(s);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const ordered = [...groups.values()]
    .sort((a, b) => sumEighths(b) - sumEighths(a))
    .flatMap((g) => [...g].sort((a, b) => DN_ORDER[a.day_night] - DN_ORDER[b.day_night] || a.int_ext.localeCompare(b.int_ext)));

  const days: string[][] = [];
  let current: string[] = [];
  let used = 0;
  for (const s of ordered) {
    const size = Math.max(1, s.page_eighths || 1);
    if (current.length && used + size > limit) {
      days.push(current);
      current = [];
      used = 0;
    }
    current.push(s.id);
    used += size;
  }
  if (current.length) days.push(current);
  return days;
}

export type Layout = { days: Array<{ id: string; sceneIds: string[] }>; bank: string[] };

/**
 * Moves a scene into a day (null = unscheduled) before the item now at `index`
 * (end of the list when omitted). Returns a new layout.
 */
export function moveScene(layout: Layout, sceneId: string, toDay: string | null, index?: number): Layout {
  const place = (ids: string[]) => {
    const from = ids.indexOf(sceneId);
    let at = index ?? ids.length;
    if (from >= 0 && from < at) at -= 1; // removing it first shifts later items up
    const rest = ids.filter((x) => x !== sceneId);
    at = Math.max(0, Math.min(at, rest.length));
    return [...rest.slice(0, at), sceneId, ...rest.slice(at)];
  };
  const drop = (ids: string[]) => ids.filter((x) => x !== sceneId);
  return {
    bank: toDay === null ? place(layout.bank) : drop(layout.bank),
    days: layout.days.map((d) => ({ ...d, sceneIds: d.id === toDay ? place(d.sceneIds) : drop(d.sceneIds) })),
  };
}

/** Fills {name} placeholders in a dictionary string. */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** A wa.me link; without a usable international number WhatsApp lets you pick the chat. */
export function whatsappLink(phone: string | null | undefined, text: string) {
  let digits = (phone ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else digits = ""; // a local number has no country code, so let the sender choose the chat
  digits = digits.replace(/\D/g, "");
  return `https://wa.me/${digits.length >= 8 ? digits : ""}?text=${encodeURIComponent(text)}`;
}

/** The call sheet as returned by call_sheet_for_day / call_sheet_view. */
export type CallSheetData = {
  project: string | null;
  company: string | null;
  day: { number: number; total: number; date: string | null; general_call: string | null; wrap_time: string | null };
  location: { name: string; address: string | null } | null;
  sheet: { weather?: string | null; nearest_hospital?: string | null; general_notes?: string | null };
  scenes: Array<{ scene_number: string; int_ext: Enums["int_ext"]; location_name: string | null; day_night: Enums["day_night"]; page_eighths: number; synopsis: string | null; cast: number[] }>;
  cast: Array<{ number: number | null; character: string; actor: string | null; call_time: string | null }>;
  people: Array<{ name: string; role: string | null; kind: Enums["contact_kind"]; call_time: string | null }>;
  recipient?: { name: string; call_time: string | null; status: Enums["recipient_status"] };
};
