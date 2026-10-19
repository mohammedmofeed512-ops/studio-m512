/**
 * Team permissions: one level per project tool. 0 = no access, 1 = view, 2 = edit.
 * The database enforces the same levels (authz.level); this module drives the UI.
 */
export const AREAS = ["script", "breakdown", "shots", "schedule", "call_sheets", "lookbook", "tasks", "team"] as const;
export type Area = (typeof AREAS)[number];
export type Level = 0 | 1 | 2;
export type Levels = Record<Area, Level>;

export const FULL: Levels = { script: 2, breakdown: 2, shots: 2, schedule: 2, call_sheets: 2, lookbook: 2, tasks: 2, team: 2 };
export const NONE: Levels = { script: 0, breakdown: 0, shots: 0, schedule: 0, call_sheets: 0, lookbook: 0, tasks: 0, team: 0 };

export const ROLES = ["producer", "director", "writer", "assistant_director", "dop", "editor", "client", "viewer", "custom"] as const;
export type Role = (typeof ROLES)[number];

/** Starting permissions for each role; every level can be changed afterwards. */
export const ROLE_PRESETS: Record<Exclude<Role, "custom">, Levels> = {
  producer: { ...FULL },
  director: { script: 2, breakdown: 2, shots: 2, schedule: 1, call_sheets: 1, lookbook: 2, tasks: 2, team: 0 },
  writer: { script: 2, breakdown: 1, shots: 1, schedule: 0, call_sheets: 0, lookbook: 1, tasks: 1, team: 0 },
  assistant_director: { script: 1, breakdown: 2, shots: 1, schedule: 2, call_sheets: 2, lookbook: 1, tasks: 2, team: 0 },
  dop: { script: 1, breakdown: 1, shots: 2, schedule: 1, call_sheets: 1, lookbook: 2, tasks: 1, team: 0 },
  editor: { script: 1, breakdown: 0, shots: 1, schedule: 0, call_sheets: 0, lookbook: 1, tasks: 1, team: 0 },
  client: { script: 1, breakdown: 0, shots: 1, schedule: 0, call_sheets: 0, lookbook: 1, tasks: 0, team: 0 },
  viewer: { script: 1, breakdown: 1, shots: 1, schedule: 1, call_sheets: 1, lookbook: 1, tasks: 1, team: 0 },
};

/** Cleans any stored or submitted value into a full set of levels. */
export function normalizeLevels(value: unknown): Levels {
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out = { ...NONE };
  for (const a of AREAS) {
    const n = Number(src[a]);
    out[a] = n === 1 || n === 2 ? n : 0;
  }
  return out;
}

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

/** The role whose preset matches these levels exactly, otherwise "custom". */
export function roleFor(levels: Levels): Role {
  for (const [role, preset] of Object.entries(ROLE_PRESETS)) if (AREAS.every((a) => preset[a] === levels[a])) return role as Role;
  return "custom";
}

/** Which permission area a project tool needs. */
export const TOOL_AREA: Record<string, Area | null> = {
  overview: null,
  script: "script",
  breakdown: "breakdown",
  shots: "shots",
  schedule: "schedule",
  callSheets: "call_sheets",
  lookbook: "lookbook",
  team: null,
};

export type Access = { isOwner: boolean; ownerId: string; levels: Levels };
export const canView = (access: Access, area: Area) => access.levels[area] >= 1;
export const canEdit = (access: Access, area: Area) => access.levels[area] === 2;

/** True when an ISO timestamp is in the past. */
export const isPast = (iso: string) => Date.parse(iso) < Date.now();
