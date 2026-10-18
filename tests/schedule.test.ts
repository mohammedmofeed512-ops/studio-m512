import { test } from "node:test";
import assert from "node:assert/strict";
import { fill, moveScene, planDays, stripColor, whatsappLink, type StripScene } from "../src/lib/production/schedule";
import { matchesSearch, normalizeSearch, projectFromPath, toolHref } from "../src/lib/project-tools";

const sc = (id: string, location: string, dn: StripScene["day_night"], eighths: number, ie: StripScene["int_ext"] = "int"): StripScene => ({
  id,
  scene_number: id,
  int_ext: ie,
  location_name: location,
  day_night: dn,
  page_eighths: eighths,
  synopsis: null,
});

test("planDays groups by location, day before night, and respects the page limit", () => {
  const scenes = [sc("1", "بيت", "night", 8), sc("2", "شارع", "day", 4), sc("3", "بيت", "day", 16), sc("4", "بيت", "day", 8), sc("5", "شارع", "night", 4)];
  const days = planDays(scenes, 3); // 24 eighths per day
  assert.deepEqual(days, [["3", "4"], ["1", "2", "5"]]);
  // A scene longer than a day still gets scheduled, alone.
  assert.deepEqual(planDays([sc("a", "x", "day", 50), sc("b", "x", "day", 4)], 1), [["a"], ["b"]]);
});

test("moveScene reorders within a day and moves between day and bank", () => {
  const layout = { days: [{ id: "d1", sceneIds: ["a", "b", "c"] }, { id: "d2", sceneIds: [] }], bank: ["x"] };
  assert.deepEqual(moveScene(layout, "a", "d1", 3).days[0].sceneIds, ["b", "c", "a"]);
  assert.deepEqual(moveScene(layout, "c", "d1", 0).days[0].sceneIds, ["c", "a", "b"]);
  assert.deepEqual(moveScene(layout, "b", "d1", 3).days[0].sceneIds, ["a", "c", "b"]); // "down" from index 1
  const moved = moveScene(layout, "x", "d2");
  assert.deepEqual(moved.bank, []);
  assert.deepEqual(moved.days[1].sceneIds, ["x"]);
  const back = moveScene(layout, "b", null, 0);
  assert.deepEqual(back.bank, ["b", "x"]);
  assert.deepEqual(back.days[0].sceneIds, ["a", "c"]);
});

test("strip colours follow the industry convention", () => {
  assert.equal(stripColor("int", "day").bg, "#FFFFFF");
  assert.equal(stripColor("ext", "day").bg, "#FFF4B8");
  assert.equal(stripColor("int", "night").bg, "#DCE7FF");
  assert.equal(stripColor("ext", "night").bg, "#DDF3E2");
});

test("whatsapp links only use international numbers", () => {
  assert.match(whatsappLink("+970 59-123-4567", "hi"), /^https:\/\/wa\.me\/970591234567\?text=hi$/);
  assert.match(whatsappLink("00970591234567", "hi"), /wa\.me\/970591234567\?/);
  assert.match(whatsappLink("0591234567", "hi"), /wa\.me\/\?text=hi/);
  assert.match(whatsappLink(null, "a b"), /text=a%20b/);
  assert.equal(fill("اليوم {x} من {y}", { x: 2, y: 5 }), "اليوم 2 من 5");
});

test("quick-jump search folds Arabic letter forms", () => {
  assert.equal(normalizeSearch("أوراق الاستدعاء"), normalizeSearch("اوراق الاستدعاء"));
  assert.ok(matchesSearch("جدول التصوير · فيلم المدينة", "تصوير مدينه"));
  assert.ok(!matchesSearch("التفريغ", "لقطات"));
  assert.ok(matchesSearch("Shooting Schedule", "sched"));
});

test("project paths map to tools and keep the chosen script", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  assert.deepEqual(projectFromPath(`/projects/${id}/call-sheets/abc`), { projectId: id, tool: "callSheets" });
  assert.deepEqual(projectFromPath(`/projects/${id}`), { projectId: id, tool: "overview" });
  assert.equal(projectFromPath("/projects/new"), null);
  assert.equal(toolHref(id, "schedule", "s1"), `/projects/${id}/schedule?script=s1`);
  assert.equal(toolHref(id, "callSheets", "s1"), `/projects/${id}/call-sheets`);
});
