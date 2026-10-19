"use client";

import { useState, useTransition } from "react";
import { requestUpgrade, withdrawUpgrade } from "@/lib/admin-actions";
import { fill } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type PlanCardData = {
  id: string;
  name: string;
  price: string | null;
  description: string | null;
  highlight: boolean;
  position: number;
  maxProjects: number | null;
  maxMembers: number | null;
  storage: string | null; // formatted, null = unlimited
  callSheets: boolean;
  claude: boolean;
};

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${on ? "bg-ok-tint text-ok" : "bg-ground text-faint"}`}>
      {on ? "✓" : "–"}
    </span>
  );
}

/** Side-by-side plan cards: what each plan includes, and a request button. */
export function PlanCards({
  plans,
  currentId,
  pending,
  t,
}: {
  plans: PlanCardData[];
  currentId: string;
  pending: { id: string; planId: string } | null;
  t: Dictionary["plan"];
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, start] = useTransition();
  const currentPos = plans.find((p) => p.id === currentId)?.position ?? 0;

  return (
    <>
      {pending ? (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-tint px-5 py-3">
          <span className="font-bold text-accent-ink">{fill(t.pending, { plan: plans.find((p) => p.id === pending.planId)?.name ?? pending.planId })}</span>
          <button type="button" className="btn-ghost h-8 bg-white" disabled={busy} onClick={() => start(() => withdrawUpgrade(pending.id))}>
            {t.withdraw}
          </button>
        </div>
      ) : sent ? (
        <p role="status" className="mb-4 rounded-[10px] bg-ok-tint px-5 py-3 font-bold text-ok">
          {t.sent}
        </p>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-stretch gap-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentId;
          const features: Array<[string, boolean]> = [
            [p.maxProjects === null ? t.unlimitedProjects : fill(t.projectsN, { n: p.maxProjects }), true],
            [p.maxMembers === null ? t.unlimitedMembers : fill(t.membersN, { n: p.maxMembers }), p.maxMembers !== 0],
            [p.storage === null ? t.unlimitedStorage : fill(t.storageN, { n: `\u2066${p.storage}\u2069` }), true],
            [t.always, true],
            [t.call_sheets, p.callSheets],
            [t.claude, p.claude],
          ];
          return (
            <article
              key={p.id}
              aria-labelledby={`plan-${p.id}`}
              className={`relative flex flex-col rounded-[14px] bg-white p-6 ${p.highlight ? "ring-2 ring-accent" : "ring-1 ring-line"} ${isCurrent ? "bg-tint/40" : ""}`}
            >
              {p.highlight ? (
                <span className="absolute -top-3 start-6 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-white">{t.recommended}</span>
              ) : null}
              <h2 id={`plan-${p.id}`} className="text-[18px] font-extrabold">
                {p.name}
              </h2>
              {p.price ? <p className="mt-2 text-[24px] font-extrabold text-accent-ink">{p.price}</p> : null}
              {p.description ? <p className="mt-2 min-h-[40px] text-[12px] leading-relaxed text-body">{p.description}</p> : null}
              <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-line pt-5 text-[13px]">
                {features.map(([label, on]) => (
                  <li key={label} className={`flex items-start gap-2.5 ${on ? "" : "text-faint"}`}>
                    <Check on={on} />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <span className="flex h-10 items-center justify-center rounded-md bg-ground text-[12px] font-bold text-muted">{t.yourPlan}</span>
                ) : pending ? (
                  pending.planId === p.id ? (
                    <span className="flex h-10 items-center justify-center rounded-md bg-tint text-[12px] font-bold text-accent-ink">⏳</span>
                  ) : null
                ) : asking === p.id ? (
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      start(async () => {
                        const r = await requestUpgrade(p.id, message);
                        if (r.ok) {
                          setAsking(null);
                          setMessage("");
                          setSent(true);
                        }
                      });
                    }}
                  >
                    <label>
                      <span className="label">{t.message}</span>
                      <textarea rows={2} maxLength={1000} autoFocus className="field h-auto py-2" value={message} onChange={(e) => setMessage(e.target.value)} />
                    </label>
                    <button className="btn-primary h-10" disabled={busy}>
                      {t.send}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAsking(p.id)}
                    className={`h-10 w-full ${p.highlight ? "btn-primary" : "btn-soft"}`}
                  >
                    {p.position < currentPos ? t.lower : t.choose}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
