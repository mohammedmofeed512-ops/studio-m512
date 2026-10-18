"use client";

import { useParams } from "next/navigation";
import { ProjectSidebar } from "../project-sidebar";

const bar = "animate-pulse rounded-md bg-[#ECEDF2]";

export function TopSkeleton() {
  return (
    <>
      <div className="flex h-[60px] shrink-0 items-center border-b border-line bg-white px-6">
        <div className={`${bar} h-4 w-48`} />
      </div>
      <div className="flex h-[52px] items-center gap-2.5 bg-white px-6 shadow-[0_1px_0_var(--color-line)]">
        <div className={`${bar} size-7`} />
        <div className={`${bar} h-4 w-36`} />
      </div>
    </>
  );
}

export function ContentSkeleton() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3 p-6 max-sm:p-4" aria-busy="true">
      <div className={`${bar} h-28 w-full`} />
      <div className={`${bar} h-14 w-full`} />
      <div className={`${bar} h-14 w-full`} />
      <div className={`${bar} h-14 w-3/4`} />
    </main>
  );
}

/** Shown instantly while a project tool loads: the sidebar stays put, only the content waits. */
export function ProjectSkeleton() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <TopSkeleton />
      <div className="flex flex-1 max-md:flex-col">
        <ProjectSidebar projectId={id} />
        <ContentSkeleton />
      </div>
    </>
  );
}
