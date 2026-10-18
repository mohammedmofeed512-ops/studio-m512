import type { ElementCategory } from "@/lib/database.types";
import type { ScriptLine } from "@/lib/screenplay/model";

/** Highlight colour per breakdown category (pastels that keep black text readable). */
export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  cast: "#F7B6C4",
  extras: "#FFE08A",
  props: "#B9E6C3",
  wardrobe: "#FFC994",
  makeup: "#F3C2EE",
  location: "#BFCBFA",
  set_dressing: "#D7C7A8",
  vehicles: "#F9A9A0",
  animals: "#C9E7A2",
  sfx: "#9EDCF0",
  vfx: "#C8B6F7",
  sound: "#A8E3D6",
  other: "#DADCE5",
};

/** The lines of one scene: its heading and everything up to the next heading. */
export function sceneLines(lines: ScriptLine[], sceneId: string): ScriptLine[] {
  const start = lines.findIndex((l) => l.kind === "sceneHeading" && l.sceneId === sceneId);
  if (start < 0) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.kind === "sceneHeading");
  return lines.slice(start, end < 0 ? undefined : start + 1 + end);
}

/** Character cues without extensions: "سلمى (خارج الكادر)" → "سلمى", "SALMA (V.O.)" → "SALMA". */
export function cleanCharacterName(text: string): string {
  return text
    .replace(/\s*[(（][^)）]*[)）]\s*/g, " ")
    .replace(/\s*(CONT'?D|CONTINUED|V\.O\.|O\.S\.|O\.C\.)\s*$/i, "")
    .replace(/[:：]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distinct speaking characters of a scene, in order of first appearance. */
export function speakingCharacters(lines: ScriptLine[]): string[] {
  const seen = new Map<string, string>();
  for (const l of lines) {
    if (l.kind !== "character") continue;
    const name = cleanCharacterName(l.text);
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()];
}

export type Segment = { text: string; category?: ElementCategory; elementId?: string };

/**
 * Splits text into plain and tagged segments wherever a tagged element's name occurs.
 * Longer names win over shorter ones ("شال الجدة" before "الجدة").
 */
export function segmentText(text: string, tags: Array<{ id: string; name: string; category: ElementCategory }>): Segment[] {
  const usable = tags.filter((t) => t.name.trim().length >= 2).sort((a, b) => b.name.length - a.name.length);
  if (!usable.length || !text) return [{ text }];
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${usable.map((t) => escape(t.name.trim())).join("|")})`, "giu");
  const byName = new Map(usable.map((t) => [t.name.trim().toLowerCase(), t]));
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    const tag = byName.get(m[0].toLowerCase());
    out.push({ text: m[0], category: tag?.category, elementId: tag?.id });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Next shot number for a scene: 1A, 1B … 1Z, 1AA … */
export function nextShotNumber(sceneNumber: string, existing: string[]): string {
  const letters = (n: number): string => (n < 26 ? String.fromCharCode(65 + n) : letters(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26)));
  const taken = new Set(existing.map((s) => s.toUpperCase()));
  for (let i = 0; i < 26 * 27; i++) {
    const candidate = `${sceneNumber}${letters(i)}`;
    if (!taken.has(candidate.toUpperCase())) return candidate;
  }
  return `${sceneNumber}-${existing.length + 1}`;
}
