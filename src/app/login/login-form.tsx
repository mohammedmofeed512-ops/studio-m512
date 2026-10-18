"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type FormState } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function LoginForm({ t }: { t: Dictionary["login"] }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState<FormState, FormData>(signIn, undefined);
  const [upState, upAction, upPending] = useActionState<FormState, FormData>(signUp, undefined);
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;

  const message =
    state?.message === "checkEmail" ? t.checkEmail : state?.error === "invalid" ? t.invalid : state?.error ? t.failed : "";

  return (
    <>
      <h1 className="mb-7 text-center text-[20px] font-extrabold">{mode === "in" ? t.title : t.signUpTitle}</h1>
      <form key={mode} action={mode === "in" ? inAction : upAction} className="flex flex-col gap-4">
        {mode === "up" ? (
          <div>
            <label htmlFor="full_name" className="label">
              {t.fullName}
            </label>
            <input id="full_name" name="full_name" autoComplete="name" maxLength={120} className="field" />
          </div>
        ) : null}
        <div>
          <label htmlFor="email" className="label">
            {t.email}
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="field text-start" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            {t.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "up" ? 8 : undefined}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            dir="ltr"
            className="field text-start"
            aria-describedby={mode === "up" ? "pw-hint" : undefined}
          />
          {mode === "up" ? (
            <p id="pw-hint" className="mt-1 text-[11px] text-muted">
              {t.passwordHint}
            </p>
          ) : null}
        </div>
        <button className="btn-primary mt-2 h-11 text-[13px]" disabled={pending}>
          {mode === "in" ? t.signIn : t.signUp}
        </button>
        <p role="status" aria-live="polite" className={`min-h-5 text-center text-[12px] ${state?.error ? "text-warn" : "text-ok"}`}>
          {message}
        </p>
      </form>
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mx-auto mt-1 block text-[12px] font-semibold text-accent-ink hover:underline">
        {mode === "in" ? t.toSignUp : t.toSignIn}
      </button>
    </>
  );
}
