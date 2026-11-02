"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/actions";
import { Button, input, label } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, undefined);
  return (
    <form action={action} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className={label} htmlFor="name">Nombre</label>
          <input id="name" name="name" className={input} required autoComplete="name" />
        </div>
      )}
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className={input} required autoComplete="email" />
      </div>
      <div>
        <label className={label} htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" className={input} required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </div>
      {mode === "register" && (
        <>
          <div>
            <label className={label} htmlFor="weight">Peso corporal (kg) — para estimar kcal</label>
            <input id="weight" name="weight" type="number" step="0.1" defaultValue={75} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="invite">Código de invitación (si te lo han dado)</label>
            <input id="invite" name="invite" className={input} />
          </div>
        </>
      )}
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{mode === "login" ? "Entrar" : "Crear cuenta"}</Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>¿No tienes cuenta? <Link className="text-accent" href="/registro">Regístrate</Link></>
        ) : (
          <>¿Ya tienes cuenta? <Link className="text-accent" href="/login">Entra</Link></>
        )}
      </p>
    </form>
  );
}
