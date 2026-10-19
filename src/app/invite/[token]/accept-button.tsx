"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptInvitation } from "@/lib/team-actions";

export function AcceptButton({ token, label, errors }: { token: string; label: string; errors: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="btn-primary h-11 w-full text-[14px]"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await acceptInvitation(token);
            if (r.ok) router.push(`/projects/${r.projectId}`);
            else setError(errors[r.error] ?? errors.invalid);
          })
        }
      >
        {label}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-[12px] font-bold text-warn">
          {error}
        </p>
      ) : null}
    </>
  );
}
