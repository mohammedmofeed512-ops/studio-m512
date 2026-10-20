"use client";

import { useActionState, useState } from "react";
import { resendConfirmation, signIn, signUp, type FormState } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function LoginForm({
  t,
  next = "",
  email = "",
  startMode = "in",
  linkError = false,
}: {
  t: Dictionary["login"];
  next?: string;
  email?: string;
  startMode?: "in" | "up";
  linkError?: boolean;
}) {
  const [mode, setMode] = useState<"in" | "up">(startMode);
  const [typedEmail, setTypedEmail] = useState(email);
  const [inState, inAction, inPending] = useActionState<FormState, FormData>(signIn, undefined);
  const [upState, upAction, upPending] = useActionState<FormState, FormData>(signUp, undefined);
  const [reState, reAction, rePending] = useActionState<FormState, FormData>(resendConfirmation, undefined);
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;

  const errors = {
    invalid: t.invalid,
    notConfirmed: t.notConfirmed,
    alreadyRegistered: t.alreadyRegistered,
    weakPassword: t.weakPassword,
    emailSend: t.emailSend,
    rateLimit: t.rateLimit,
  } as Record<string, string>;
  const message =
    state?.message === "checkEmail" ? t.checkEmail : state?.error ? (errors[state.error] ?? t.failed) : linkError && !state ? t.linkError : "";
  const isError = Boolean(state?.error) || (linkError && !state);

  // Offer a fresh confirmation link wherever someone may be waiting for one.
  const offerResend = state?.message === "checkEmail" || state?.error === "notConfirmed" || (linkError && !state);
  const reMessage = reState?.message === "resent" ? t.resent : reState?.error ? (errors[reState.error] ?? t.failed) : "";

  return (
    <>
      <h1 className="mb-7 text-center text-[20px] font-extrabold">{mode === "in" ? t.title : t.signUpTitle}</h1>
      <form key={mode} action={mode === "in" ? inAction : upAction} className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            value={typedEmail}
            onChange={(e) => setTypedEmail(e.target.value)}
            className="field text-start"
          />
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
        <p role="status" aria-live="polite" className={`min-h-5 text-center text-[12px] ${isError ? "text-warn" : "text-ok"}`}>
          {message}
        </p>
      </form>

      {offerResend ? (
        <form action={reAction} className="mb-3 rounded-md bg-ground/70 px-4 py-3 text-center">
          <input type="hidden" name="email" value={typedEmail} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <p className="mb-2 text-[12px] text-muted">{t.spamHint}</p>
          <button className="btn-soft" disabled={rePending || !typedEmail}>
            {t.resend}
          </button>
          {reMessage ? (
            <p role="status" aria-live="polite" className={`mt-2 text-[12px] ${reState?.error ? "text-warn" : "text-ok"}`}>
              {reMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mx-auto mt-1 block text-[12px] font-semibold text-accent-ink hover:underline">
        {mode === "in" ? t.toSignUp : t.toSignIn}
      </button>
    </>
  );
}
