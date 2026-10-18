"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ProfileForm({ t, fullName, company }: { t: Dictionary; fullName: string; company: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="full_name" className="label">
          {t.settings.fullName}
        </label>
        <input id="full_name" name="full_name" maxLength={120} defaultValue={fullName} className="field" />
      </div>
      <div>
        <label htmlFor="company_name" className="label">
          {t.settings.company}
        </label>
        <input id="company_name" name="company_name" maxLength={120} defaultValue={company} className="field" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {t.common.save}
        </button>
        <p role="status" className={`text-[12px] ${state?.error ? "text-warn" : "text-ok"}`}>
          {state?.message === "saved" ? t.settings.saved : state?.error ? t.login.failed : ""}
        </p>
      </div>
    </form>
  );
}
