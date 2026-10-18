import { test, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

before(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const g = globalThis as Record<string, unknown>;
  for (const k of ["window", "document", "navigator", "Node", "HTMLElement", "KeyboardEvent", "MutationObserver", "getComputedStyle", "DOMParser", "Element"]) {
    Object.defineProperty(g, k, { value: (dom.window as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
  }
  g.requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
  // jsdom has no layout: give elements and ranges empty geometry so scroll-into-view is a no-op.
  const rect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) });
  const empty = () => Object.assign([], { item: () => null });
  for (const proto of [dom.window.Element.prototype, dom.window.Range.prototype] as unknown as Array<Record<string, unknown>>) {
    proto.getClientRects = empty;
    proto.getBoundingClientRect = rect;
  }
});

const editors: Array<{ destroy: () => void }> = [];
afterEach(async () => {
  await new Promise((r) => setTimeout(r, 20));
  while (editors.length) editors.pop()!.destroy();
});

async function makeEditor(lines?: Array<{ kind: string; text: string }>) {
  const { Editor } = await import("@tiptap/core");
  const Text = (await import("@tiptap/extension-text")).default;
  const { UndoRedo } = await import("@tiptap/extensions");
  const { ElementNode, ScreenplayDocument, ScreenplayKeys } = await import("../src/components/screenplay/element-node");
  const { linesToDoc } = await import("../src/lib/screenplay/model");
  const el = document.createElement("div");
  document.body.appendChild(el);
  const editor = new Editor({
    element: el,
    extensions: [ScreenplayDocument, ElementNode, Text, UndoRedo, ScreenplayKeys],
    content: linesToDoc((lines ?? [{ kind: "sceneHeading", text: "" }]) as never),
  });
  editors.push(editor);
  return editor;
}

function press(editor: import("@tiptap/core").Editor, key: string, opts: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, ...opts });
  editor.view.someProp("handleKeyDown", (f) => f(editor.view, event));
}

function kinds(editor: import("@tiptap/core").Editor) {
  const out: string[] = [];
  editor.state.doc.forEach((n) => out.push(`${n.attrs.kind}:${n.textContent}`));
  return out;
}

test("typing a scene flows through elements with Enter", async () => {
  const editor = await makeEditor();
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  editor.commands.insertContent("داخلي. مطبخ - نهار");
  press(editor, "Enter"); // heading -> action
  editor.commands.insertContent("تقف سلمى.");
  press(editor, "Enter"); // action -> action
  press(editor, "Tab"); // empty action -> character
  editor.commands.insertContent("سلمى");
  press(editor, "Enter"); // character -> dialogue
  editor.commands.insertContent("ما رجع؟");
  press(editor, "Enter"); // dialogue -> action
  editor.commands.insertContent("خارجي - الطريق - ليل");
  press(editor, "Enter"); // action that looks like a heading becomes a heading, next is action
  assert.deepEqual(kinds(editor), [
    "sceneHeading:داخلي. مطبخ - نهار",
    "action:تقف سلمى.",
    "character:سلمى",
    "dialogue:ما رجع؟",
    "sceneHeading:خارجي - الطريق - ليل",
    "action:",
  ]);
});

test("scene headings always carry unique ids, others none", async () => {
  const editor = await makeEditor([
    { kind: "sceneHeading", text: "INT. A - DAY" },
    { kind: "action", text: "x" },
  ]);
  editor.commands.insertContent(" "); // any change triggers the id plugin
  const ids: Array<string | null> = [];
  editor.state.doc.forEach((n) => ids.push(n.attrs.sceneId));
  assert.ok(ids[0] && ids[0].length === 36);
  assert.equal(ids[1], null);

  // Split the heading at its start: both halves must end up with different ids.
  editor.commands.setTextSelection(1);
  press(editor, "Enter");
  const after: Array<string | null> = [];
  editor.state.doc.forEach((n) => n.attrs.kind === "sceneHeading" && after.push(n.attrs.sceneId));
  assert.equal(new Set(after).size, after.length);
});

test("Tab cycles and Mod-number sets the element", async () => {
  const editor = await makeEditor([{ kind: "action", text: "سطر" }]);
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  press(editor, "Tab");
  assert.equal(kinds(editor)[0], "character:سطر");
  press(editor, "Tab", { shiftKey: true });
  assert.equal(kinds(editor)[0], "action:سطر");
  press(editor, "6", { ctrlKey: true });
  assert.equal(kinds(editor)[0], "transition:سطر");
});
