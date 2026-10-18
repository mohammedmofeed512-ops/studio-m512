"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoTagCast } from "@/lib/production-actions";

export function AutoCastButton({ projectId, scriptId, label, hint }: { projectId: string; scriptId: string; label: string; hint: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={hint}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await autoTagCast({ projectId, scriptId });
          router.refresh();
        })
      }
      className="btn-soft h-8"
    >
      {pending ? "…" : label}
    </button>
  );
}
