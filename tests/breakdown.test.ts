import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCharacterName, nextShotNumber, sceneLines, segmentText, speakingCharacters } from "../src/lib/production/breakdown";
import type { ScriptLine } from "../src/lib/screenplay/model";

const lines: ScriptLine[] = [
  { kind: "sceneHeading", text: "داخلي. مطبخ - نهار", sceneId: "a" },
  { kind: "action", text: "تقف سلمى، على الطاولة كوب شاي وشال الجدة." },
  { kind: "character", text: "سلمى" },
  { kind: "dialogue", text: "ما رجع؟" },
  { kind: "character", text: "الأم (خارج الكادر)" },
  { kind: "dialogue", text: "قال قبل المغرب." },
  { kind: "character", text: "سلمى" },
  { kind: "sceneHeading", text: "خارجي - طريق - ليل", sceneId: "b" },
  { kind: "action", text: "طريق." },
];

test("scene slicing and characters", () => {
  assert.equal(sceneLines(lines, "a").length, 7);
  assert.equal(sceneLines(lines, "b").length, 2);
  assert.deepEqual(speakingCharacters(sceneLines(lines, "a")), ["سلمى", "الأم"]);
  assert.equal(cleanCharacterName("SALMA (V.O.)"), "SALMA");
  assert.equal(cleanCharacterName("JOHN CONT'D"), "JOHN");
});

test("highlight segments prefer longer names", () => {
  const segs = segmentText(lines[1].text, [
    { id: "1", name: "سلمى", category: "cast" },
    { id: "2", name: "الجدة", category: "cast" },
    { id: "3", name: "شال الجدة", category: "wardrobe" },
    { id: "4", name: "كوب شاي", category: "props" },
  ]);
  const tagged = segs.filter((s) => s.category).map((s) => `${s.category}:${s.text}`);
  assert.deepEqual(tagged, ["cast:سلمى", "props:كوب شاي", "wardrobe:شال الجدة"]);
  assert.equal(segs.map((s) => s.text).join(""), lines[1].text);
});

test("shot numbering", () => {
  assert.equal(nextShotNumber("1", []), "1A");
  assert.equal(nextShotNumber("1", ["1A", "1B"]), "1C");
  assert.equal(nextShotNumber("12", ["12A"]), "12B");
});
