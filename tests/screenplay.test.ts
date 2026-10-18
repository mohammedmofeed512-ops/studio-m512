import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLines, parseFdx, parseFountain, textToRawLines } from "../src/lib/screenplay/import";
import { extractScenes, formatEighths, looksLikeSceneHeading, parseSceneHeading, linesToDoc, docToLines, nextOnTab } from "../src/lib/screenplay/model";

test("Arabic scene headings", () => {
  assert.ok(looksLikeSceneHeading("1. داخلي. مطبخ بيت العائلة – نهار"));
  assert.ok(looksLikeSceneHeading("خارجي - الطريق الترابي - غروب"));
  assert.ok(!looksLikeSceneHeading("تقف سلمى أمام النافذة"));
  assert.deepEqual(parseSceneHeading("1. داخلي. مطبخ بيت العائلة – نهار"), { intExt: "int", location: "مطبخ بيت العائلة", dayNight: "day" });
  assert.deepEqual(parseSceneHeading("خارجي - سطح البيت - ليل"), { intExt: "ext", location: "سطح البيت", dayNight: "night" });
  assert.equal(parseSceneHeading("داخلي/خارجي. السيارة - غروب").intExt, "int_ext");
});

test("English scene headings", () => {
  assert.deepEqual(parseSceneHeading("INT. KITCHEN - DAY"), { intExt: "int", location: "KITCHEN", dayNight: "day" });
  assert.deepEqual(parseSceneHeading("EXT. ROOFTOP - NIGHT"), { intExt: "ext", location: "ROOFTOP", dayNight: "night" });
  assert.equal(parseSceneHeading("INT./EXT. CAR - DUSK").intExt, "int_ext");
});

test("Arabic plain text from Word is classified", () => {
  const text = [
    "1. داخلي. مطبخ بيت العائلة – نهار",
    "",
    "تقف سلمى أمام النافذة، تراقب الطريق.",
    "",
    "سلمى",
    "(دون أن تلتفت)",
    "ما رجع لسّا؟",
    "",
    "الأم",
    "قال قبل المغرب.",
    "",
    "قطع إلى:",
    "",
    "خارجي - الطريق الترابي - غروب",
  ].join("\n");
  const kinds = classifyLines(textToRawLines(text)).map((l) => l.kind);
  assert.deepEqual(kinds, ["sceneHeading", "action", "character", "parenthetical", "dialogue", "character", "dialogue", "transition", "sceneHeading"]);
});

test("Fountain", () => {
  const src = `Title: Test\nAuthor: M\n\nINT. KITCHEN - DAY\n\nSalma watches the road.\n\nSALMA\n(quietly)\nHe's not back yet?\n\n> CUT TO:\n\n.ROOF\n\n@Mother\nBefore sunset.`;
  const lines = parseFountain(src);
  assert.deepEqual(lines.map((l) => l.kind), ["sceneHeading", "action", "character", "parenthetical", "dialogue", "transition", "sceneHeading", "character", "dialogue"]);
  assert.equal(lines[6].text, "ROOF");
});

test("Final Draft FDX", () => {
  const xml = `<?xml version="1.0"?><FinalDraft><Content>
  <Paragraph Type="Scene Heading"><Text>INT. KITCHEN - DAY</Text></Paragraph>
  <Paragraph Type="Action"><Text>Salma waits &amp; watches.</Text></Paragraph>
  <Paragraph Type="Character"><Text>SALMA</Text></Paragraph>
  <Paragraph Type="Dialogue"><Text Style="Bold">Not </Text><Text>yet.</Text></Paragraph>
  <Paragraph Type="Transition"><Text>CUT TO:</Text></Paragraph>
  </Content></FinalDraft>`;
  const lines = parseFdx(xml);
  assert.deepEqual(lines.map((l) => l.kind), ["sceneHeading", "action", "character", "dialogue", "transition"]);
  assert.equal(lines[1].text, "Salma waits & watches.");
  assert.equal(lines[3].text, "Not yet.");
});

test("scenes, eighths, round trip", () => {
  const lines = [
    { kind: "sceneHeading" as const, text: "1. داخلي. مطبخ – نهار", sceneId: "a" },
    { kind: "action" as const, text: "وصف قصير." },
    { kind: "sceneHeading" as const, text: "خارجي - سطح - ليل", sceneId: "b" },
    { kind: "action" as const, text: "x".repeat(600) },
  ];
  const scenes = extractScenes(lines);
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].number, "1");
  assert.equal(scenes[1].number, "2");
  assert.equal(scenes[1].dayNight, "night");
  assert.equal(scenes[0].synopsis, "وصف قصير.");
  assert.ok(scenes[1].pageEighths >= 1);
  assert.equal(formatEighths(11), "1 3/8");
  assert.equal(formatEighths(6), "6/8");
  assert.deepEqual(docToLines(linesToDoc(lines)).map((l) => l.text), lines.map((l) => l.text));
  assert.equal(nextOnTab("action"), "character");
  assert.equal(nextOnTab("action", true), "sceneHeading");
});
