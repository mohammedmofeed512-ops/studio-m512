"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createProject, updateProject, type FormState } from "@/lib/actions";
import { PROJECT_STAGES, PROJECT_TYPES, type Project } from "@/lib/database.types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ProjectForm({ t, project }: { t: Dictionary; project?: Project }) {
  const [state, action, pending] = useActionState<FormState, FormData>(project ? updateProject : createProject, undefined);
  const p = t.projects;

  return (
    <form action={action} className="grid grid-cols-2 gap-x-4 gap-y-4 max-sm:grid-cols-1">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <div className="col-span-2 max-sm:col-span-1">
        <label htmlFor="name" className="label">
          {p.name}
        </label>
        <input id="name" name="name" required maxLength={160} defaultValue={project?.name} className="field" autoFocus={!project} />
      </div>
      <div>
        <label htmlFor="type" className="label">
          {p.type}
        </label>
        <select id="type" name="type" defaultValue={project?.type ?? "short"} className="field">
          {PROJECT_TYPES.map((v) => (
            <option key={v} value={v}>
              {t.projectTypes[v]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="stage" className="label">
          {p.stage}
        </label>
        <select id="stage" name="stage" defaultValue={project?.stage ?? "development"} className="field">
          {PROJECT_STAGES.map((v) => (
            <option key={v} value={v}>
              {t.projectStages[v]}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 max-sm:col-span-1">
        <label htmlFor="client_name" className="label">
          {p.client} <span className="font-normal">({t.common.optional})</span>
        </label>
        <input id="client_name" name="client_name" maxLength={160} defaultValue={project?.client_name ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="start_date" className="label">
          {p.startDate}
        </label>
        <input id="start_date" name="start_date" type="date" defaultValue={project?.start_date ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="delivery_date" className="label">
          {p.deliveryDate}
        </label>
        <input id="delivery_date" name="delivery_date" type="date" defaultValue={project?.delivery_date ?? ""} className="field" />
      </div>
      <div className="col-span-2 max-sm:col-span-1">
        <label htmlFor="notes" className="label">
          {p.notes}
        </label>
        <textarea id="notes" name="notes" rows={4} maxLength={4000} defaultValue={project?.notes ?? ""} className="field h-auto py-2.5 leading-relaxed" />
      </div>
      <div className="col-span-2 flex items-center gap-3 max-sm:col-span-1">
        <button className="btn-primary" disabled={pending}>
          {project ? t.common.save : p.create}
        </button>
        <p role="status" className={`text-[12px] ${state?.error ? "text-warn" : "text-ok"}`}>
          {state?.message === "saved"
            ? t.settings.saved
            : state?.error === "limitProjects"
              ? (
                  <>
                    {t.plan.limitProjects}{" "}
                    <Link href="/plans" className="font-bold underline">
                      {t.plan.viewPlans}
                    </Link>
                  </>
                )
              : state?.error
                ? t.login.failed
                : ""}
        </p>
      </div>
    </form>
  );
}
