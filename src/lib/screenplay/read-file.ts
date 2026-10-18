"use client";

/**
 * Reads a script file in the browser and returns screenplay lines.
 * Heavy libraries (JSZip for Word, pdf.js for PDF) load only when needed.
 */
import { classifyLines, docxXmlToRawLines, parseFdx, parseFountain, pdfItemsToRawLines, type PdfItem } from "./import";
import type { ScriptLine } from "./model";

export async function readScriptFile(file: File): Promise<ScriptLine[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".fdx")) return parseFdx(await file.text());
  if (name.endsWith(".fountain") || name.endsWith(".spmd") || name.endsWith(".txt")) return parseFountain(await file.text());

  if (name.endsWith(".docx")) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error("not a docx");
    return classifyLines(docxXmlToRawLines(xml));
  }

  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const items: PdfItem[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const it of content.items) {
        if (!("str" in it)) continue;
        items.push({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width, page: p, pageWidth: viewport.width });
      }
    }
    return classifyLines(pdfItemsToRawLines(items));
  }

  throw new Error("unsupported");
}
