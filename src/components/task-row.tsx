import { deleteTask, setTaskStatus } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Task } from "@/lib/database.types";
import { IconCheck } from "./icons";

/** One task line: a round toggle (done / reopen), the title, project and due date. */
export function TaskRow({
  task,
  t,
  projectName,
  dueLabel,
  showDelete = false,
}: {
  task: Pick<Task, "id" | "title" | "status">;
  t: Dictionary;
  projectName?: string | null;
  dueLabel?: string;
  showDelete?: boolean;
}) {
  const done = task.status === "done";
  return (
    <div className="flex min-h-[46px] items-center gap-3 border-b border-line last:border-b-0">
      <form action={setTaskStatus}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="status" value={done ? "todo" : "done"} />
        <button
          aria-label={done ? t.tasks.reopen : t.tasks.markDone}
          className={`flex size-[18px] items-center justify-center rounded-full border-[1.5px] transition-colors ${
            done ? "border-accent bg-accent text-white" : "border-field hover:border-accent"
          }`}
        >
          {done ? <IconCheck size={11} strokeWidth={3} /> : null}
        </button>
      </form>
      <span className={`min-w-0 flex-1 truncate ${done ? "text-muted line-through" : ""}`}>{task.title}</span>
      {projectName ? <span className="max-w-[40%] truncate text-[12px] text-muted">{projectName}</span> : null}
      {dueLabel ? <span className="text-[12px] text-muted">{dueLabel}</span> : null}
      {showDelete ? (
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button className="btn-ghost h-7 px-2" aria-label={t.common.delete}>
            ×
          </button>
        </form>
      ) : null}
    </div>
  );
}
