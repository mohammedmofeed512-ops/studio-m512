"use client";

import { AREAS, type Area, type Level, type Levels } from "@/lib/permissions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** One row per tool with No access / View / Edit. */
export function LevelsMatrix({
  levels,
  onChange,
  t,
  disabled = false,
  idPrefix,
}: {
  levels: Levels;
  onChange: (next: Levels) => void;
  t: Pick<Dictionary, "team" | "areas">;
  disabled?: boolean;
  idPrefix: string;
}) {
  const options: Array<[Level, string]> = [
    [0, t.team.none],
    [1, t.team.view],
    [2, t.team.edit],
  ];
  return (
    <div className="grid gap-1.5" role="group" aria-label={t.team.area}>
      {AREAS.map((area: Area) => (
        <div key={area} className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-semibold">{t.areas[area]}</span>
          <div className="flex rounded-md bg-[#F1F2F6] p-0.5" role="radiogroup" aria-label={t.areas[area]}>
            {options.map(([value, label]) => {
              // "Manage team" has no view-only level.
              if (area === "team" && value === 1) return null;
              const id = `${idPrefix}-${area}-${value}`;
              return (
                <label
                  key={value}
                  htmlFor={id}
                  className={`flex h-7 cursor-pointer items-center rounded-[5px] px-2.5 text-[11px] font-bold has-[:disabled]:cursor-default ${
                    levels[area] === value ? (value === 2 ? "bg-accent text-white" : "bg-white shadow-sm") : "text-muted"
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`${idPrefix}-${area}`}
                    className="sr-only"
                    checked={levels[area] === value}
                    disabled={disabled}
                    onChange={() => onChange({ ...levels, [area]: value })}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
