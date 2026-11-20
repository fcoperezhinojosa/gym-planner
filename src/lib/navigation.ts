/** Valida una ruta interna relativa para enlaces de vuelta (`?from=…`). */
export function safeBackHref(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback;
  return trimmed;
}

/** Limpia la etiqueta opcional del enlace de vuelta (`?label=…`). */
export function safeBackLabel(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim().slice(0, 40);
  return trimmed || fallback;
}

/** Añade los parámetros `from` y `label` a una ruta interna. */
export function withBackParams(href: string, from: string, label?: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("from", from);
  if (label?.trim()) params.set("label", label.trim().slice(0, 40));
  return `${path}?${params.toString()}`;
}

/** Detecta el error interno que lanza Next.js al ejecutar `redirect()` en una Server Action. */
export function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
