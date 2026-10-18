/**
 * Screenplay model shared by the editor, the importers, scene sync and printing.
 * A script is a flat list of lines; each line has one element kind.
 */

export const ELEMENT_KINDS = ["sceneHeading", "action", "character", "parenthetical", "dialogue", "transition"] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

export type ScriptLine = { kind: ElementKind; text: string; sceneId?: string | null };

/** The TipTap/ProseMirror JSON the editor stores in script_versions.content. */
export type ScreenplayDoc = {
  type: "doc";
  content: Array<{
    type: "element";
    attrs: { kind: ElementKind; sceneId?: string | null };
    content?: Array<{ type: "text"; text: string }>;
  }>;
};

/** Element that follows when the writer presses Enter at the end of a line (Final Draft convention). */
export const NEXT_ON_ENTER: Record<ElementKind, ElementKind> = {
  sceneHeading: "action",
  action: "action",
  character: "dialogue",
  parenthetical: "dialogue",
  dialogue: "action",
  transition: "sceneHeading",
};

/** Tab cycles through the elements in this order. */
export const TAB_ORDER: ElementKind[] = ["action", "character", "parenthetical", "dialogue", "transition", "sceneHeading"];

export function nextOnTab(kind: ElementKind, reverse = false): ElementKind {
  const i = TAB_ORDER.indexOf(kind);
  const n = TAB_ORDER.length;
  return TAB_ORDER[(i + (reverse ? -1 : 1) + n) % n];
}

// ───────────── scene headings ─────────────
const INT_EXT_AR = /^(?:\d+[.\-\s]*)?\s*(داخلي\s*[-/]\s*خارجي|خارجي\s*[-/]\s*داخلي|داخلي|خارجي|د\.\s*خ\.|د\.|خ\.)[.\s:،-]*/;
const INT_EXT_EN = /^(?:\d+[A-Z]?[.\s]*)?\s*(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\/E\.?|INT\.|EXT\.|INT\s|EXT\s|EST\.)\s*/i;

const DAY_NIGHT: Array<[RegExp, DayNight]> = [
  [/(ليل|ليلاً|ليلي|NIGHT)/i, "night"],
  [/(فجر|شروق|DAWN|SUNRISE)/i, "dawn"],
  [/(غروب|مغرب|مساء|DUSK|SUNSET|EVENING)/i, "dusk"],
  [/(مستمر|متواصل|CONTINUOUS|CONT'D|LATER)/i, "continuous"],
  [/(نهار|نهاراً|صباح|ظهر|DAY|MORNING|AFTERNOON)/i, "day"],
];

export type IntExt = "int" | "ext" | "int_ext";
export type DayNight = "day" | "night" | "dawn" | "dusk" | "continuous";

/** True when a typed line looks like a scene heading (Arabic or English). */
export function looksLikeSceneHeading(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 140) return false;
  return INT_EXT_AR.test(t) || INT_EXT_EN.test(t);
}

export type ParsedHeading = { intExt: IntExt; location: string; dayNight: DayNight };

export function parseSceneHeading(text: string): ParsedHeading {
  const t = text.trim();
  let intExt: IntExt = "int";
  let rest = t;

  const ar = t.match(INT_EXT_AR);
  const en = ar ? null : t.match(INT_EXT_EN);
  const token = (ar?.[1] ?? en?.[1] ?? "").toUpperCase();
  if (/داخلي\s*[-/]\s*خارجي|خارجي\s*[-/]\s*داخلي|INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|I\/E|د\.\s*خ\./.test(token)) intExt = "int_ext";
  else if (/خارجي|^خ\.|EXT/.test(token)) intExt = "ext";
  if (ar || en) rest = t.slice((ar ?? en)![0].length);

  // Time of day is usually after the last dash.
  const parts = rest.split(/\s+[–—-]\s+|\s*[–—]\s*/);
  let dayNight: DayNight = "day";
  let location = rest;
  if (parts.length > 1) {
    const tail = parts[parts.length - 1];
    const match = DAY_NIGHT.find(([re]) => re.test(tail));
    if (match) {
      dayNight = match[1];
      location = parts.slice(0, -1).join(" - ");
    }
  } else {
    const match = DAY_NIGHT.find(([re]) => re.test(rest));
    if (match) dayNight = match[1];
  }
  location = location.replace(/[.\s:،-]+$/, "").replace(/^[.\s:،-]+/, "").trim();
  return { intExt, location, dayNight };
}

// ───────────── doc <-> lines ─────────────
export function linesToDoc(lines: ScriptLine[]): ScreenplayDoc {
  const content = (lines.length ? lines : [{ kind: "sceneHeading" as ElementKind, text: "" }]).map((l) => ({
    type: "element" as const,
    attrs: { kind: l.kind, sceneId: l.kind === "sceneHeading" ? (l.sceneId ?? null) : null },
    ...(l.text ? { content: [{ type: "text" as const, text: l.text }] } : {}),
  }));
  return { type: "doc", content };
}

export function docToLines(doc: unknown): ScriptLine[] {
  const d = doc as { content?: Array<{ attrs?: { kind?: string; sceneId?: string | null }; content?: Array<{ text?: string }> }> };
  if (!d?.content) return [];
  return d.content.map((node) => {
    const kind = (ELEMENT_KINDS as readonly string[]).includes(node.attrs?.kind ?? "") ? (node.attrs!.kind as ElementKind) : "action";
    const text = (node.content ?? []).map((c) => c.text ?? "").join("");
    return { kind, text, sceneId: node.attrs?.sceneId ?? null };
  });
}

// ───────────── scenes ─────────────
/** Lines per page in a standard screenplay (Letter, 12pt, 1" top and bottom). */
export const LINES_PER_PAGE = 55;
/** Characters per line for each element at 12pt Courier: 6" text, 3.5" dialogue, 2" parenthetical. */
const CHARS_PER_LINE: Record<ElementKind, number> = {
  sceneHeading: 60,
  action: 60,
  character: 38,
  parenthetical: 22,
  dialogue: 35,
  transition: 20,
};
/** Blank lines printed before each element. */
const SPACE_BEFORE: Record<ElementKind, number> = {
  sceneHeading: 1,
  action: 1,
  character: 1,
  parenthetical: 0,
  dialogue: 0,
  transition: 1,
};

/** Printed height of one element in lines, including the blank line before it. */
export function printedLines(line: Pick<ScriptLine, "kind" | "text">, first = false): number {
  const body = Math.max(1, Math.ceil(line.text.length / CHARS_PER_LINE[line.kind]));
  return body + (first ? 0 : SPACE_BEFORE[line.kind]);
}

/**
 * Where pages break: the index of the first element on each page after the first.
 * Elements are not split across pages, as in a printed screenplay.
 */
export function pageBreaks(lines: Array<Pick<ScriptLine, "kind" | "text">>): number[] {
  const breaks: number[] = [];
  let used = 0;
  lines.forEach((line, i) => {
    const h = printedLines(line, used === 0);
    if (used > 0 && used + h > LINES_PER_PAGE) {
      breaks.push(i);
      used = printedLines(line, true);
    } else used += h;
  });
  return breaks;
}

/** Scene number shown for each heading: an explicit leading number, otherwise its position. */
export function sceneNumberFor(text: string, sequence: number): string {
  return text.trim().match(/^(\d+[A-Za-z]?)[.\s]/)?.[1] ?? String(sequence);
}

export type ExtractedScene = {
  id: string;
  number: string;
  heading: string;
  intExt: IntExt;
  location: string;
  dayNight: DayNight;
  pageEighths: number;
  position: number;
  synopsis: string;
};

/** Reads scenes out of a script. Every heading must already carry a stable sceneId. */
export function extractScenes(lines: ScriptLine[]): ExtractedScene[] {
  const scenes: ExtractedScene[] = [];
  let current: (ExtractedScene & { lineCount: number }) | null = null;
  const close = () => {
    if (current) {
      current.pageEighths = Math.max(1, Math.round((current.lineCount / LINES_PER_PAGE) * 8));
      const { lineCount: _ignored, ...scene } = current;
      void _ignored;
      scenes.push(scene);
    }
  };
  for (const line of lines) {
    if (line.kind === "sceneHeading") {
      close();
      if (!line.sceneId || !line.text.trim()) {
        current = null;
        continue;
      }
      const parsed = parseSceneHeading(line.text);
      current = {
        id: line.sceneId,
        number: sceneNumberFor(line.text, scenes.length + 1),
        heading: line.text.trim(),
        ...parsed,
        pageEighths: 1,
        position: scenes.length,
        synopsis: "",
        lineCount: printedLines(line),
      };
    } else if (current) {
      current.lineCount += printedLines(line);
      if (!current.synopsis && line.kind === "action" && line.text.trim()) current.synopsis = line.text.trim().slice(0, 160);
    }
  }
  close();
  return scenes;
}

/** Pages shown as "1 3/8". */
export function formatEighths(eighths: number): string {
  const whole = Math.floor(eighths / 8);
  const rest = eighths % 8;
  if (!whole) return `${rest}/8`;
  return rest ? `${whole} ${rest}/8` : String(whole);
}

/** Revision colours in industry order. */
export const REVISION_COLORS = ["white", "blue", "pink", "yellow", "green", "goldenrod", "buff", "salmon", "cherry"] as const;
export type RevisionColor = (typeof REVISION_COLORS)[number];
export const REVISION_SWATCH: Record<RevisionColor, string> = {
  white: "#FFFFFF",
  blue: "#DCE7FF",
  pink: "#FCDDE6",
  yellow: "#FFF4B8",
  green: "#DDF3E2",
  goldenrod: "#F6E0A6",
  buff: "#F3E9D2",
  salmon: "#FBD9C9",
  cherry: "#F6C9CF",
};
