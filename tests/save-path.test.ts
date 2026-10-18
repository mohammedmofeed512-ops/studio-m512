import { test } from "node:test";
import assert from "node:assert/strict";
import { docToLines, extractScenes, linesToDoc } from "../src/lib/screenplay/model";

// The JSON TipTap's editor.getJSON() produces for a typed scene.
const editorJson = {
  type: "doc",
  content: [
    { type: "element", attrs: { kind: "sceneHeading", sceneId: "956fabe2-ddf2-4085-8be2-46ab847a21e8" }, content: [{ type: "text", text: "داخلي. المطبخ - نهار" }] },
    { type: "element", attrs: { kind: "action", sceneId: null }, content: [{ type: "text", text: "تقف سلمى." }] },
    { type: "element", attrs: { kind: "character", sceneId: null }, content: [{ type: "text", text: "سلمى" }] },
    { type: "element", attrs: { kind: "dialogue", sceneId: null } },
  ],
};

test("save path: editor JSON → lines → scenes → doc", () => {
  const lines = docToLines(editorJson);
  const scenes = extractScenes(lines);
  const doc = linesToDoc(lines);
  assert.equal(scenes.length, 1);
  assert.equal(doc.content.length, 4);
});
