"use client";

import { useState, useTransition } from "react";
import { addRecipients, removeRecipient, updateRecipient } from "@/lib/schedule-actions";
import { fill, whatsappLink } from "@/lib/production/schedule";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ContactKind, RecipientStatus } from "@/lib/database.types";

export type Recipient = {
  id: string;
  token: string;
  status: RecipientStatus;
  call_time: string | null;
  opened_at: string | null;
  confirmed_at: string | null;
  contact: { id: string; full_name: string; role: string | null; phone: string | null; email: string | null; kind: ContactKind };
};

const STATUS_STYLE: Record<RecipientStatus, string> = {
  pending: "bg-ground text-muted",
  sent: "bg-tint text-accent-ink",
  opened: "bg-warn-tint text-warn",
  confirmed: "bg-ok-tint text-ok",
};

/** Who gets the call sheet, each with a personal link sent by WhatsApp or email, and whether they opened and confirmed. */
export function Recipients({
  projectId,
  callSheetId,
  projectName,
  dayNumber,
  generalCall,
  recipients,
  contacts,
  t,
  kinds,
  planLabels,
}: {
  projectId: string;
  callSheetId: string;
  projectName: string;
  dayNumber: number;
  generalCall: string | null;
  recipients: Recipient[];
  contacts: Array<{ id: string; full_name: string; kind: ContactKind; role: string | null }>;
  t: Dictionary["callSheets"];
  kinds: Dictionary["contactKinds"];
  planLabels: Dictionary["plan"];
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const taken = new Set(recipients.map((r) => r.contact.id));
  const free = contacts.filter((c) => !taken.has(c.id) && c.kind !== "location");
  const freeCast = free.filter((c) => c.kind === "cast").map((c) => c.id);
  const freeCrew = free.filter((c) => c.kind === "crew").map((c) => c.id);

  const link = (r: Recipient) => `${window.location.origin}/c/${r.token}`;
  const message = (r: Recipient) =>
    `${fill(t.message, { day: dayNumber, project: projectName, time: (r.call_time ?? generalCall ?? "—").slice(0, 5) })}\n${link(r)}`;
  const markSent = (r: Recipient) => {
    if (r.status === "pending") start(() => updateRecipient({ projectId, id: r.id, sent: true }));
  };
  const [notice, setNotice] = useState("");
  const add = (ids: string[]) =>
    ids.length &&
    start(async () => {
      const r = await addRecipients({ projectId, callSheetId, contactIds: ids, callTime: generalCall });
      setNotice(!r.ok && "error" in r && r.error === "featureCallSheets" ? planLabels.featureCallSheets : "");
    });

  return (
    <section aria-labelledby="rec-h" className="card overflow-hidden">
      <div className="card-head">
        <h2 id="rec-h" className="card-title">
          {t.recipients}
        </h2>
        <span className="text-[12px] text-muted">
          {recipients.filter((r) => r.status === "confirmed").length}/{recipients.length} {t.confirmedCount}
        </span>
      </div>
      <p className="border-b border-line px-6 py-3 text-[12px] leading-relaxed text-muted">{t.sendHint}</p>

      <div className="flex flex-wrap gap-2 border-b border-line px-6 py-3">
        <select
          aria-label={t.addRecipient}
          className="field h-9 min-w-0 flex-1"
          value=""
          disabled={pending || !free.length}
          onChange={(e) => add([e.target.value])}
        >
          <option value="">{t.choose}</option>
          {free.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} · {c.role || kinds[c.kind]}
            </option>
          ))}
        </select>
        {freeCast.length ? (
          <button type="button" className="btn-soft" disabled={pending} onClick={() => add(freeCast)}>
            {t.addAllCast} ({freeCast.length})
          </button>
        ) : null}
        {freeCrew.length ? (
          <button type="button" className="btn-soft" disabled={pending} onClick={() => add(freeCrew)}>
            {t.addAllCrew} ({freeCrew.length})
          </button>
        ) : null}
      </div>

      {notice ? (
        <p role="alert" className="border-b border-line bg-warn-tint px-6 py-2.5 text-[12px] font-bold text-warn">
          {notice}
        </p>
      ) : null}
      {!recipients.length ? <p className="px-6 py-10 text-center text-muted">{t.noRecipients}</p> : null}
      <ul>
        {recipients.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-6 py-3 last:border-b-0">
            <div className="min-w-[140px] flex-1">
              <p className="font-bold">{r.contact.full_name}</p>
              <p className="text-[12px] text-muted">{r.contact.role || kinds[r.contact.kind]}</p>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
              {t.callTime}
              <input
                type="time"
                defaultValue={r.call_time?.slice(0, 5) ?? ""}
                onBlur={(e) => e.target.value !== (r.call_time?.slice(0, 5) ?? "") && start(() => updateRecipient({ projectId, id: r.id, call_time: e.target.value }))}
                className="field h-8 w-[104px] px-2"
              />
            </label>
            <span className={`badge ${STATUS_STYLE[r.status]}`}>{t[r.status]}</span>
            <span className="flex flex-wrap gap-1">
              <a
                href={whatsappLink(r.contact.phone, message(r))}
                target="_blank"
                rel="noreferrer"
                onClick={() => markSent(r)}
                className="btn h-8 bg-[#E7F7EE] px-2.5 text-[#11743F] hover:bg-[#D4F0E0]"
              >
                {t.whatsapp}
              </a>
              {r.contact.email ? (
                <a
                  href={`mailto:${encodeURIComponent(r.contact.email)}?subject=${encodeURIComponent(`${projectName} · ${t.title}`)}&body=${encodeURIComponent(message(r))}`}
                  onClick={() => markSent(r)}
                  className="btn-soft h-8 px-2.5"
                >
                  {t.email}
                </a>
              ) : null}
              <button
                type="button"
                className="btn-ghost h-8 border border-line px-2.5"
                onClick={async () => {
                  await navigator.clipboard.writeText(message(r));
                  setCopied(r.id);
                  setTimeout(() => setCopied(null), 1600);
                  markSent(r);
                }}
              >
                {copied === r.id ? t.copied : t.copyLink}
              </button>
              <button type="button" aria-label={`${t.remove} ${r.contact.full_name}`} className="btn-danger h-8 px-2" disabled={pending} onClick={() => start(() => removeRecipient(projectId, r.id))}>
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
