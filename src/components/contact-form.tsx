"use client";

import { useActionState, useEffect, useRef } from "react";
import { createContact, type FormState } from "@/lib/actions";
import { CONTACT_KINDS, type ContactKind } from "@/lib/database.types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ContactForm({ t, defaultKind }: { t: Dictionary; defaultKind?: ContactKind }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createContact, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.message === "saved") formRef.current?.reset();
  }, [state]);
  const c = t.contacts;

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px] flex-[2]">
        <label htmlFor="full_name" className="label">
          {c.name}
        </label>
        <input id="full_name" name="full_name" required maxLength={160} className="field" />
      </div>
      <div className="min-w-[140px] flex-1">
        <label htmlFor="kind" className="label">
          {c.kind}
        </label>
        <select id="kind" name="kind" defaultValue={defaultKind ?? "crew"} className="field">
          {CONTACT_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.contactKinds[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[140px] flex-1">
        <label htmlFor="role" className="label">
          {c.role}
        </label>
        <input id="role" name="role" maxLength={120} className="field" />
      </div>
      <div className="min-w-[140px] flex-1">
        <label htmlFor="phone" className="label">
          {c.phone}
        </label>
        <input id="phone" name="phone" type="tel" dir="ltr" maxLength={40} className="field text-start" />
      </div>
      <div className="min-w-[180px] flex-[1.5]">
        <label htmlFor="email" className="label">
          {c.email}
        </label>
        <input id="email" name="email" type="email" dir="ltr" maxLength={320} className="field text-start" />
      </div>
      <button className="btn-primary h-10" disabled={pending}>
        + {t.common.add}
      </button>
      {state?.error ? (
        <p role="alert" className="w-full text-[12px] text-warn">
          {t.login.failed}
        </p>
      ) : null}
    </form>
  );
}
