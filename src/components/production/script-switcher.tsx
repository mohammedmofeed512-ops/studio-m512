import Link from "next/link";

/** Picks which screenplay of the project a tool works on (only shown when there are several). */
export function ScriptSwitcher({ scripts, activeId, hrefFor, label }: { scripts: Array<{ id: string; title: string }>; activeId: string; hrefFor: (id: string) => string; label: string }) {
  if (scripts.length < 2) return null;
  const active = scripts.find((s) => s.id === activeId);
  return (
    <details className="relative">
      <summary className="btn-ghost h-8 cursor-pointer list-none border border-line [&::-webkit-details-marker]:hidden">
        {label}: {active?.title}
      </summary>
      <ul className="absolute end-0 top-10 z-30 w-[260px] rounded-[10px] border border-line bg-white p-1.5 shadow-lg">
        {scripts.map((s) => (
          <li key={s.id}>
            <Link href={hrefFor(s.id)} aria-current={s.id === activeId ? "page" : undefined} className="pill-nav h-9">
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
