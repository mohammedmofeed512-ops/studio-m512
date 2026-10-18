"use client";

import { useFormStatus } from "react-dom";
import { useTransition } from "react";
import { setCastActor } from "@/lib/schedule-actions";

export function SaveButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/** Links a character to the actor who plays them. */
export function CastActorSelect({
  projectId,
  elementId,
  value,
  actors,
  emptyLabel,
  label,
}: {
  projectId: string;
  elementId: string;
  value: string | null;
  actors: Array<{ id: string; full_name: string }>;
  emptyLabel: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label}
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        start(() => setCastActor(projectId, elementId, v));
      }}
      className="field h-8 py-0 text-[12px]"
    >
      <option value="">{emptyLabel}</option>
      {actors.map((a) => (
        <option key={a.id} value={a.id}>
          {a.full_name}
        </option>
      ))}
    </select>
  );
}
