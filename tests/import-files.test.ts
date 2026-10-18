import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { classifyLines, docxXmlToRawLines, pdfItemsToRawLines, type PdfItem } from "../src/lib/screenplay/import";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

test("Arabic Word file", async () => {
  const zip = await JSZip.loadAsync(fixture("arabic.docx"));
  const xml = await zip.file("word/document.xml")!.async("string");
  const lines = classifyLines(docxXmlToRawLines(xml));
  assert.deepEqual(
    lines.map((l) => l.kind),
    ["sceneHeading", "action", "character", "parenthetical", "dialogue", "character", "dialogue", "transition", "sceneHeading", "action"],
  );
  assert.equal(lines[2].text, "سلمى");
});

test("Screenplay-formatted PDF", async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(fixture("english.pdf")), verbosity: 0 }).promise;
  const items: PdfItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    for (const it of tc.items) if ("str" in it) items.push({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width, page: p, pageWidth: vp.width });
  }
  const lines = classifyLines(pdfItemsToRawLines(items));
  assert.deepEqual(
    lines.map((l) => `${l.kind}:${l.text}`),
    [
      "sceneHeading:INT. KITCHEN - DAY",
      "action:Salma stands at the window, watching the road.",
      "character:SALMA",
      "parenthetical:(without turning)",
      "dialogue:He's not back yet?",
      "character:MOTHER",
      "dialogue:He said before sunset.",
      "transition:CUT TO:",
      "sceneHeading:EXT. DIRT ROAD - DUSK",
      "action:The sun sinks behind the olive trees.",
    ],
  );
});
