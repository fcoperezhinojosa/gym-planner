import type { CSSProperties, ReactNode } from "react";

/** Re-mapea los tokens genéricos (naranja) a la paleta cobalto de Hoy para botones y selecciones del formulario. */
const HOY_TOKENS = {
  "--accent": "var(--hoy-blue)",
  "--accent-fg": "#ffffff",
  "--accent-soft": "var(--hoy-tint)",
} as CSSProperties;

/** Contenedor común de los formularios que se despliegan bajo el botón principal de Hoy. */
export function ActionPanel({ title, hint, hoy = false, children }: { title: string; hint: string; hoy?: boolean; children: ReactNode }) {
  return (
    <div style={hoy ? HOY_TOKENS : undefined} className="mt-1 w-full basis-full rounded-2xl border border-hoy-line bg-card p-4 text-fg">
      <div className="mb-3 space-y-0.5">
        <h3 className="font-display text-[17px] font-bold">{title}</h3>
        <p className="text-sm text-hoy-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}
