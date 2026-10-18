/** Two-column AV scripts (video | audio) for commercials, documentaries and corporate films. */

export type AvRow = { id: string; video: string; audio: string; seconds: number | null };
export type AvDoc = { type: "av"; rows: AvRow[] };

/** Spoken pace used to estimate a row's length when no duration is set. */
const WORDS_PER_SECOND = 2.3;

export function estimateSeconds(audio: string): number {
  const words = audio.trim().split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / WORDS_PER_SECOND)) : 0;
}

export function rowSeconds(row: AvRow): number {
  return row.seconds ?? estimateSeconds(row.audio);
}

export function totalSeconds(rows: AvRow[]): number {
  return rows.reduce((sum, r) => sum + rowSeconds(r), 0);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function newRowId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(16).slice(2)}`;
}

export function emptyAvDoc(): AvDoc {
  return { type: "av", rows: [{ id: newRowId(), video: "", audio: "", seconds: null }] };
}

/** Validates untrusted JSON into an AvDoc. */
export function sanitizeAvDoc(input: unknown): AvDoc {
  const rows = Array.isArray((input as AvDoc)?.rows) ? (input as AvDoc).rows : [];
  return {
    type: "av",
    rows: rows.slice(0, 2000).map((r) => ({
      id: typeof r?.id === "string" && r.id.length <= 64 ? r.id : newRowId(),
      video: typeof r?.video === "string" ? r.video.slice(0, 5000) : "",
      audio: typeof r?.audio === "string" ? r.audio.slice(0, 5000) : "",
      seconds: typeof r?.seconds === "number" && Number.isFinite(r.seconds) && r.seconds >= 0 ? Math.min(Math.round(r.seconds), 36000) : null,
    })),
  };
}
