import Link from "next/link";
import { formatEighths } from "@/lib/screenplay/model";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type SceneRow = { id: string; scene_number: string; int_ext: string; location_name: string | null; day_night: string; page_eighths: number };

const INT_EXT: Record<string, { ar: string; en: string }> = {
  int: { ar: "داخلي", en: "INT" },
  ext: { ar: "خارجي", en: "EXT" },
  int_ext: { ar: "د/خ", en: "I/E" },
};
const DAY_NIGHT: Record<string, { ar: string; en: string }> = {
  day: { ar: "نهار", en: "DAY" },
  night: { ar: "ليل", en: "NIGHT" },
  dawn: { ar: "فجر", en: "DAWN" },
  dusk: { ar: "غروب", en: "DUSK" },
  continuous: { ar: "مستمر", en: "CONT." },
};

/** INT/EXT and day/night labels in one language, for client components. */
export function slugLabels(locale: "ar" | "en") {
  const pick = (m: Record<string, { ar: string; en: string }>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v[locale]]));
  return { intExt: pick(INT_EXT), dayNight: pick(DAY_NIGHT) };
}

export function sceneSlug(scene: Pick<SceneRow, "int_ext" | "day_night">, locale: "ar" | "en") {
  return `${INT_EXT[scene.int_ext]?.[locale] ?? ""} · ${DAY_NIGHT[scene.day_night]?.[locale] ?? ""}`;
}

/** Column listing a script's scenes; each links to the same page with ?scene= set. */
export function ScenePicker({
  scenes,
  activeId,
  hrefFor,
  counts,
  countLabel,
  locale,
  t,
}: {
  scenes: SceneRow[];
  activeId: string | null;
  hrefFor: (sceneId: string) => string;
  counts?: Map<string, number>;
  countLabel?: string;
  locale: "ar" | "en";
  t: Dictionary;
}) {
  return (
    <nav aria-label={t.scripts.scenes} className="w-[240px] shrink-0 border-e border-line bg-white max-lg:w-full max-lg:border-e-0 max-lg:border-b">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-3.5">
        <span className="text-[14px] font-extrabold">{t.scripts.scenes}</span>
        <span className="text-[12px] text-muted">{scenes.length}</span>
      </div>
      <ol className="flex max-h-[calc(100dvh-170px)] flex-col gap-0.5 overflow-y-auto p-2 max-lg:max-h-56">
        {scenes.map((s) => {
          const active = s.id === activeId;
          const n = counts?.get(s.id) ?? 0;
          return (
            <li key={s.id}>
              <Link
                href={hrefFor(s.id)}
                aria-current={active ? "page" : undefined}
                className={`flex items-start gap-2.5 rounded-md px-2.5 py-2 ${active ? "bg-tint" : "hover:bg-ground"}`}
              >
                <span className={`mt-0.5 min-w-6 text-[12px] font-extrabold ${active ? "text-accent-ink" : "text-muted"}`}>{s.scene_number}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-semibold ${active ? "text-accent-ink" : ""}`}>{s.location_name || "—"}</span>
                  <span className="block text-[11px] text-muted">
                    {sceneSlug(s, locale)} · {formatEighths(s.page_eighths)}
                    {counts ? ` · ${n} ${countLabel ?? ""}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
