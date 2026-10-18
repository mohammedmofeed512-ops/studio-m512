/**
 * Turns scripts from other tools into screenplay lines.
 * - Final Draft (.fdx): element types are explicit in the XML.
 * - Fountain: plain-text screenplay markup.
 * - Word / PDF: text only, so each line is classified with layout heuristics
 *   (scene keywords, centring, short name lines followed by speech).
 */
import { looksLikeSceneHeading, type ElementKind, type ScriptLine } from "./model";

export type RawLine = { text: string; align?: "start" | "center" | "end" | null; force?: ElementKind | null };

const TRANSITION = /^(قطع\s*(إلى|الى)|انتقال|مزج|إظلام|ظلام|اختفاء|تلاشي|نهاية|CUT TO|SMASH CUT|MATCH CUT|JUMP CUT|DISSOLVE|FADE (IN|OUT|TO)|FADE OUT|THE END)\b|(إلى|الى|TO):?\s*$/i;
const ENDS_LIKE_SENTENCE = /[.؟?!،,؛;…"”]$/;

function isUpperLatin(text: string) {
  return /[A-Z]/.test(text) && text === text.toUpperCase();
}

/**
 * Classifies lines that carry no element types. Blank lines matter: they end dialogue
 * blocks and mark where a character cue may start.
 */
export function classifyLines(raw: RawLine[]): ScriptLine[] {
  const out: ScriptLine[] = [];
  let prev: ElementKind | null = null;
  let prevBlank = true;

  for (let i = 0; i < raw.length; i++) {
    const text = raw[i].text.replace(/\s+/g, " ").trim();
    const align = raw[i].align ?? null;
    if (!text) {
      prevBlank = true;
      if (prev === "dialogue" || prev === "parenthetical" || prev === "character") prev = "action";
      continue;
    }
    // Page numbers and "(CONT'D)"-style artefacts from PDFs.
    if (/^\d{1,3}\.?$/.test(text) || /^(MORE|\(MORE\)|\(يتبع\))$/i.test(text)) continue;

    const next = raw.slice(i + 1).find((l) => l.text.trim());
    const nextIsAdjacent = Boolean(raw[i + 1]?.text.trim());
    let kind: ElementKind;

    if (raw[i].force) kind = raw[i].force!;
    else if (looksLikeSceneHeading(text)) kind = "sceneHeading";
    else if (TRANSITION.test(text) && text.length < 40) kind = "transition";
    else if (/^\(.*\)$/.test(text) && (prev === "character" || prev === "dialogue" || prev === "parenthetical")) kind = "parenthetical";
    else if ((prev === "character" || prev === "parenthetical") && !prevBlank) kind = "dialogue";
    else if (prev === "dialogue" && !prevBlank) kind = "dialogue";
    else if (
      prevBlank &&
      next &&
      nextIsAdjacent &&
      text.length <= 35 &&
      !ENDS_LIKE_SENTENCE.test(text.replace(/\s*\([^)]*\)\s*$/, "")) &&
      !looksLikeSceneHeading(next.text) &&
      (align === "center" || isUpperLatin(text) || (!/[A-Za-z]/.test(text) && text.split(" ").length <= 4))
    )
      kind = "character";
    else if (align === "center" && prev === "character") kind = "dialogue";
    else kind = "action";

    out.push({ kind, text });
    prev = kind;
    prevBlank = false;
  }
  return out;
}

// ───────────── Fountain ─────────────
export function parseFountain(source: string): ScriptLine[] {
  // Drop the title page (key: value lines before the first blank line) and boneyard/notes.
  let text = source.replace(/\r\n?/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\[\[[\s\S]*?\]\]/g, "");
  const firstBlock = text.split("\n\n")[0];
  if (/^[A-Za-z ]+:/m.test(firstBlock) && !looksLikeSceneHeading(firstBlock.split("\n")[0])) text = text.slice(firstBlock.length);

  const raw: RawLine[] = [];
  for (const line of text.split("\n")) {
    let t = line.trim();
    let force: ElementKind | null = null;
    if (/^\.[^.]/.test(t)) {
      force = "sceneHeading";
      t = t.slice(1);
    } else if (t.startsWith("@")) {
      force = "character";
      t = t.slice(1);
    } else if (t.startsWith(">") && !t.endsWith("<")) {
      force = "transition";
      t = t.slice(1);
    } else if (t.startsWith("!")) {
      force = "action";
      t = t.slice(1);
    } else if (/^(#|=)/.test(t)) {
      continue; // sections and synopses
    }
    t = t.replace(/^>\s*|\s*<$/g, "").replace(/\*{1,3}|_/g, "").trim();
    raw.push({ text: t, force });
  }
  return classifyLines(raw);
}

// ───────────── Final Draft (.fdx) ─────────────
const FDX_TYPES: Record<string, ElementKind> = {
  "scene heading": "sceneHeading",
  action: "action",
  general: "action",
  shot: "action",
  character: "character",
  parenthetical: "parenthetical",
  dialogue: "dialogue",
  transition: "transition",
};

function decodeXml(s: string) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

export function parseFdx(xml: string): ScriptLine[] {
  const content = xml.match(/<Content>([\s\S]*?)<\/Content>/)?.[1] ?? xml;
  const lines: ScriptLine[] = [];
  const paragraph = /<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/g;
  let m: RegExpExecArray | null;
  while ((m = paragraph.exec(content))) {
    const type = (m[1].match(/Type="([^"]+)"/)?.[1] ?? "Action").toLowerCase();
    const texts = [...m[2].matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)].map((t) => decodeXml(t[1]));
    const text = texts.join("").replace(/\s+/g, " ").trim();
    if (!text) continue;
    lines.push({ kind: FDX_TYPES[type] ?? "action", text });
  }
  return lines;
}

// ───────────── PDF text positions → lines ─────────────
export type PdfItem = { str: string; x: number; y: number; width: number; page: number; pageWidth: number };

/** Groups positioned text from a PDF into lines with an alignment guess, keeping vertical gaps as blank lines. */
export function pdfItemsToRawLines(items: PdfItem[]): RawLine[] {
  const byLine = new Map<string, PdfItem[]>();
  for (const it of items) {
    if (!it.str.trim()) continue;
    const key = `${it.page}:${Math.round(it.y / 3)}`;
    (byLine.get(key) ?? byLine.set(key, []).get(key)!).push(it);
  }
  const rows = [...byLine.entries()]
    .map(([key, parts]) => {
      const [page] = key.split(":").map(Number);
      const y = parts[0].y;
      const minX = Math.min(...parts.map((p) => p.x));
      const maxX = Math.max(...parts.map((p) => p.x + p.width));
      const rtl = parts.some((p) => /[\u0600-\u06FF]/.test(p.str));
      // Rebuild the line in visual order, adding a space wherever chunks have a visible gap.
      const ordered = [...parts].sort((a, b) => a.x - b.x);
      let text = "";
      ordered.forEach((p, idx) => {
        const prevPart = ordered[idx - 1];
        const gap = prevPart ? p.x - (prevPart.x + prevPart.width) : 0;
        const needsSpace = prevPart && gap > 1 && !text.endsWith(" ") && !p.str.startsWith(" ");
        text += (needsSpace ? " " : "") + p.str;
      });
      if (rtl) {
        // Arabic chunks were placed left-to-right on the page; reverse word order back to reading order.
        const words = ordered.map((p) => p.str.trim()).filter(Boolean);
        text = words.reverse().join(" ");
      }
      return { page, y, minX, maxX, pageWidth: parts[0].pageWidth, text: text.replace(/\s+/g, " ").trim() };
    })
    .sort((a, b) => a.page - b.page || b.y - a.y);

  const raw: RawLine[] = [];
  let prev: (typeof rows)[number] | null = null;
  for (const row of rows) {
    if (prev && prev.page === row.page && prev.y - row.y > 18) raw.push({ text: "" });
    if (prev && prev.page !== row.page) raw.push({ text: "" });
    const center = (row.minX + row.maxX) / 2;
    const width = row.maxX - row.minX;
    const isCentered = Math.abs(center - row.pageWidth / 2) < row.pageWidth * 0.08 && width < row.pageWidth * 0.55;
    raw.push({ text: row.text, align: isCentered ? "center" : "start" });
    prev = row;
  }
  return raw;
}

/**
 * Word (.docx) body XML → lines. Each <w:p> is one line; empty paragraphs are blank lines;
 * centred paragraphs are flagged so names and dialogue can be recognised.
 */
export function docxXmlToRawLines(xml: string): RawLine[] {
  const body = xml.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? xml;
  const lines: RawLine[] = [];
  for (const m of body.matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)) {
    const inner = m[1] ?? "";
    const jc = inner.match(/<w:jc\s+w:val="([^"]+)"/)?.[1];
    const text = [...inner.matchAll(/<w:(t|tab|br)\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:t>)/g)]
      .map((t) => (t[1] === "t" ? decodeXml(t[2] ?? "") : " "))
      .join("");
    // A paragraph with line breaks inside becomes several lines.
    const parts = inner.includes("<w:br") ? text.split(/\s{2,}/) : [text];
    for (const part of parts) lines.push({ text: part, align: jc === "center" ? "center" : "start" });
  }
  return lines;
}

/** Plain text → lines; paragraphs separated by empty lines stay separated. */
export function textToRawLines(text: string): RawLine[] {
  return text.replace(/\r\n?/g, "\n").split("\n").map((t) => ({ text: t }));
}
