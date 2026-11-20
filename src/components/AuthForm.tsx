"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { login, register } from "@/app/actions";
import {
  createAndStoreBootConfig,
  markSessionBootStart,
  readOrCreateBootConfig,
  resetSessionBoot,
  resolveBootConfig,
  writeSessionBootSteps,
} from "@/lib/boot-loader";
import { SessionLoadingScreen } from "./SessionLoadingScreen";
import { Button, input, label } from "./ui";

function PendingAuthLoader({ message }: { message: string }) {
  const [resolved] = useState(() => resolveBootConfig(readOrCreateBootConfig()));
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => {
      writeSessionBootSteps(1);
      setCompletedSteps(1);
    }, 420);
    const t2 = setTimeout(() => {
      writeSessionBootSteps(2);
      setCompletedSteps(2);
    }, 860);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <SessionLoadingScreen
      variant={resolved.variant}
      welcomeMessage={resolved.welcomeMessage}
      steps={resolved.steps}
      message={message}
      completedSteps={completedSteps}
    />
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, undefined);

  // Al entrar en login/registro se reinicia la marca de sesión para mostrar la carga al acceder.
  useEffect(() => {
    resetSessionBoot();
  }, []);

  return (
    <>
      {pending && (
        <PendingAuthLoader
          message={mode === "login" ? "Iniciando sesión…" : "Creando tu cuenta…"}
        />
      )}
      <form
        action={action}
        onSubmit={() => {
          resetSessionBoot();
          createAndStoreBootConfig();
          markSessionBootStart();
        }}
        className="space-y-4"
      >
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
            <>¿No tienes cuenta? <Link className="font-semibold text-accent-text hover:underline" href="/registro">Regístrate</Link></>
          ) : (
            <>¿Ya tienes cuenta? <Link className="font-semibold text-accent-text hover:underline" href="/login">Entra</Link></>
          )}
        </p>
      </form>
    </>
  );
}
