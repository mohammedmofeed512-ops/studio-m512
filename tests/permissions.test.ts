import { test } from "node:test";
import assert from "node:assert/strict";
import { FULL, ROLE_PRESETS, normalizeLevels, roleFor } from "../src/lib/permissions";

test("levels are cleaned to 0, 1 or 2 for every tool", () => {
  const l = normalizeLevels({ script: "2", shots: 5, schedule: -1, call_sheets: 1, extra: 2 });
  assert.equal(l.script, 2);
  assert.equal(l.shots, 0);
  assert.equal(l.schedule, 0);
  assert.equal(l.call_sheets, 1);
  assert.equal("extra" in l, false);
  assert.deepEqual(normalizeLevels(null), normalizeLevels({}));
});

test("roles are recognised from their levels, anything else is custom", () => {
  assert.equal(roleFor(ROLE_PRESETS.writer), "writer");
  assert.equal(roleFor(FULL), "producer");
  assert.equal(roleFor({ ...ROLE_PRESETS.writer, shots: 2 }), "custom");
  // Only producers manage the team by default.
  for (const [role, levels] of Object.entries(ROLE_PRESETS)) if (role !== "producer") assert.equal(levels.team, 0, role);
});

test("plan errors from the database map to messages", async () => {
  const { planError, formatBytes } = await import("../src/lib/plan");
  assert.equal(planError('new row violates: plan_limit:projects'), "limitProjects");
  assert.equal(planError("plan_limit:members"), "limitMembers");
  assert.equal(planError("plan_feature:call_sheets"), "featureCallSheets");
  assert.equal(planError("something else"), null);
  assert.equal(formatBytes(200 * 1024 * 1024), "200.0 MB");
});
