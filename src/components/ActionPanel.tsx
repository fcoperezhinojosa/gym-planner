import type { ReactNode } from "react";

/** Contenedor común de los paneles de acción desplegables. */
export function ActionPanel({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="mt-1 w-full basis-full rounded-2xl border border-line bg-card p-4 text-fg">
      <div className="mb-3 space-y-0.5">
        <h3 className="font-display text-[17px] font-bold">{title}</h3>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}
