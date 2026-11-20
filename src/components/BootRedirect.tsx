"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  SESSION_BOOT_VARIANT_ATTR,
  isSessionBooted,
  markSessionBootStart,
  readOrCreateBootConfig,
  resolveBootConfig,
  writeSessionBootSteps,
} from "@/lib/boot-loader";
import { SessionLoadingScreen } from "./SessionLoadingScreen";

const STEP_1_MS = 450;
const STEP_2_MS = 920;

const noopSubscribe = () => () => {};

/**
 * Entrada instantánea de la PWA (/boot), precacheada por el Service Worker para que
 * Android/iOS retire su splash nativo en milisegundos y muestre nuestra pantalla de
 * carga animada mientras Next.js carga "/" desde el servidor en paralelo.
 */
export function BootRedirect() {
  const router = useRouter();
  const bootConfig = useSyncExternalStore(noopSubscribe, readOrCreateBootConfig, () => null);
  const [completedSteps, setCompletedSteps] = useState(0);

  useLayoutEffect(() => {
    if (bootConfig) {
      document.documentElement.setAttribute(SESSION_BOOT_VARIANT_ATTR, String(bootConfig.variant));
    }
  }, [bootConfig]);

  useEffect(() => {
    if (isSessionBooted()) {
      router.replace("/");
      return;
    }

    markSessionBootStart();
    writeSessionBootSteps(0);

    const t1 = setTimeout(() => {
      writeSessionBootSteps(1);
      setCompletedSteps(1);
    }, STEP_1_MS);

    const t2 = setTimeout(() => {
      writeSessionBootSteps(2);
      setCompletedSteps(2);
    }, STEP_2_MS);

    // Lanza la carga real de "/" en paralelo sin sustituir el historial (Botón atrás limpio).
    if (!navigator.onLine) {
      window.location.replace("/");
    } else {
      router.replace("/");
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [router]);

  const resolved = bootConfig ? resolveBootConfig(bootConfig) : null;

  return (
    <SessionLoadingScreen
      className="gp-boot-splash"
      variant={resolved?.variant}
      welcomeMessage={resolved?.welcomeMessage}
      steps={resolved?.steps}
      message="Cargando tu sesión…"
      completedSteps={completedSteps}
    />
  );
}
