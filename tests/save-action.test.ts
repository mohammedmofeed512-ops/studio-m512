import { test, mock } from "node:test";
import assert from "node:assert/strict";

const calls: string[] = [];
function builder(table: string, op = "select") {
  const b: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    calls.push(`${table}.${name}(${JSON.stringify(args).slice(0, 80)})`);
    return b;
  };
  for (const m of ["select", "eq", "not", "order", "limit", "single"]) b[m] = chain(m);
  b.update = (v: unknown) => { calls.push(`${table}.update ${JSON.stringify(v).slice(0, 60)}`); return b; };
  b.delete = () => { calls.push(`${table}.delete`); return b; };
  b.upsert = (v: unknown) => { calls.push(`${table}.upsert ${JSON.stringify(v).slice(0, 60)}`); return Promise.resolve({ error: null }); };
  b.maybeSingle = () => Promise.resolve({ data: table === "scripts" ? { id: "c44ff120-65bc-453a-aa11-f7290ce0afac", kind: "screenplay", current_version_id: "11111111-1111-1111-1111-111111111111" } : null, error: null });
  b.then = (res: (v: unknown) => void) => res({ data: null, error: null });
  void op;
  return b;
}
const fakeSupabase = { from: (t: string) => builder(t) };

mock.module("server-only", { namedExports: {} });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", { namedExports: { redirect: () => {} } });
mock.module("@/lib/supabase/server", { namedExports: { requireUser: async () => ({ supabase: fakeSupabase, userId: "u", email: "e" }) } });

test("saveScriptContent on a typed scene", async () => {
  const { saveScriptContent } = await import("../src/lib/script-actions");
  const result = await saveScriptContent("c44ff120-65bc-453a-aa11-f7290ce0afac", {
    type: "doc",
    content: [
      { type: "element", attrs: { kind: "sceneHeading", sceneId: "956fabe2-ddf2-4085-8be2-46ab847a21e8" }, content: [{ type: "text", text: "داخلي. المطبخ - نهار" }] },
      { type: "element", attrs: { kind: "action", sceneId: null }, content: [{ type: "text", text: "تقف سلمى." }] },
    ],
  });
  assert.equal(result.ok, true);
  const write = calls.findIndex((c) => c.startsWith("script_versions.update"));
  const sync = calls.findIndex((c) => c.startsWith("scenes.delete"));
  assert.ok(write >= 0 && sync > write, "text is saved before scenes are synced");
});
