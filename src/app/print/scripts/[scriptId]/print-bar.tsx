"use client";

import { useEffect } from "react";

/** Opens the print dialog once fonts are ready; the browser's "Save as PDF" makes the file. */
export function PrintBar({ label, back }: { label: string; back: string }) {
  useEffect(() => {
    const go = () => setTimeout(() => window.print(), 300);
    if (document.fonts?.ready) document.fonts.ready.then(go);
    else go();
  }, []);
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
      <button type="button" onClick={() => window.close()} className="btn-ghost">
        {back}
      </button>
      <button type="button" onClick={() => window.print()} className="btn-primary">
        {label}
      </button>
    </div>
  );
}
