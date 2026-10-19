/** A project's tools in workflow order. `step` numbers match the Alt+number shortcuts. */
export const PROJECT_TOOLS = [
  { key: "overview", path: "", step: 0 },
  { key: "script", path: "/scripts", step: 1 },
  { key: "breakdown", path: "/breakdown", step: 2 },
  { key: "shots", path: "/shots", step: 3 },
  { key: "schedule", path: "/schedule", step: 4 },
  { key: "callSheets", path: "/call-sheets", step: 5 },
  { key: "lookbook", path: "/lookbook", step: 6 },
  { key: "team", path: "/team", step: 7 },
] as const;

export type ProjectToolKey = (typeof PROJECT_TOOLS)[number]["key"];

/** Tools that read the chosen screenplay keep ?script= when you move between them. */
export const SCRIPT_AWARE: ReadonlySet<ProjectToolKey> = new Set(["breakdown", "shots", "schedule"]);

const PROJECT_PATH = /^\/projects\/([0-9a-f-]{36})(\/[^/]+)?/i;

/** The project id and tool for a pathname, or null outside a project. */
export function projectFromPath(pathname: string): { projectId: string; tool: ProjectToolKey } | null {
  const m = pathname.match(PROJECT_PATH);
  if (!m) return null;
  const tool = PROJECT_TOOLS.find((t) => t.path === (m[2] ?? ""))?.key ?? "overview";
  return { projectId: m[1], tool };
}

export function toolHref(projectId: string, key: ProjectToolKey, script?: string | null) {
  const tool = PROJECT_TOOLS.find((t) => t.key === key)!;
  const q = script && SCRIPT_AWARE.has(key) ? `?script=${script}` : "";
  return `/projects/${projectId}${tool.path}${q}`;
}

/** Lowercases and folds Arabic letter variants and diacritics so search is forgiving. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every word of the query appears in the text. */
export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = normalizeSearch(text);
  return q.split(" ").every((w) => hay.includes(w));
}
