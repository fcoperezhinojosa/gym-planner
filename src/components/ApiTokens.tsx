"use client";

import { useActionState, useTransition } from "react";
import { createApiToken, revokeApiToken } from "@/app/actions";
import { Button, input, label } from "./ui";

export type TokenRow = { id: number; name: string; scope: string; createdAt: string; lastUsedAt: string | null };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES") : "nunca");

export function ApiTokens({ tokens, baseUrl }: { tokens: TokenRow[]; baseUrl: string }) {
  const [state, action, pending] = useActionState(createApiToken, undefined);
  const [revoking, start] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Crea un token para que una IA (Instinct, Claude, ChatGPT…) consulte qué toca hoy, analice tu entreno y cree rutinas y ejercicios.
      </p>

      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label className={label} htmlFor="tname">Nombre</label>
          <input id="tname" name="name" placeholder="Instinct" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="tscope">Permisos</label>
          <select id="tscope" name="scope" className={input} defaultValue="edit">
            <option value="edit">Leer + crear/editar</option>
            <option value="read">Solo lectura</option>
          </select>
        </div>
        <Button disabled={pending}>Crear token</Button>
      </form>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      {state?.token && (
        <div className="space-y-2 rounded-xl border border-accent bg-accent-soft p-3 text-sm">
          <p className="font-semibold">Copia el token ahora: no se volverá a mostrar.</p>
          <code className="block break-all rounded-lg bg-bg p-2 text-xs">{state.token}</code>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(state.token!)}>Copiar</Button>
        </div>
      )}

      {tokens.length > 0 && (
        <ul className="divide-y divide-line text-sm">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="block font-medium">{t.name}</span>
                <span className="block text-xs text-muted">
                  {t.scope === "read" ? "Solo lectura" : "Leer + editar"} · creado {fmt(t.createdAt)} · último uso {fmt(t.lastUsedAt)}
                </span>
              </span>
              <Button
                variant="danger"
                size="sm"
                disabled={revoking}
                onClick={() => confirm(`¿Revocar el token "${t.name}"? Las IAs que lo usen dejarán de funcionar.`) && start(() => revokeApiToken(t.id))}
              >
                Revocar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Cómo conectarla</summary>
        <div className="mt-2 space-y-2 text-muted">
          <p>
            <strong className="text-fg">MCP</strong> (Claude Code, Cursor, etc.): URL <code className="break-all">{baseUrl}/api/mcp</code> con la cabecera
            <code> Authorization: Bearer TU_TOKEN</code>.
          </p>
          <p>
            <strong className="text-fg">API REST</strong>: <code className="break-all">{baseUrl}/api/v1/openapi.json</code> describe todos los endpoints (p. ej.
            <code> GET /api/v1/today</code>). Cualquier IA con acceso HTTP puede usarla con el mismo token.
          </p>
          <p>El enlace a la rutina de hoy se abre en tu móvil con tu sesión iniciada.</p>
        </div>
      </details>
    </div>
  );
}
