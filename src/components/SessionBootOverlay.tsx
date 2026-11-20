"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  SESSION_BOOT_ATTR,
  SESSION_BOOT_VARIANT_ATTR,
  isSessionBooted,
  markSessionBooted,
  readOrCreateBootConfig,
  readSessionBootStart,
  readSessionBootSteps,
  resolveBootConfig,
  writeSessionBootSteps,
} from "@/lib/boot-loader";
import { SessionLoadingScreen } from "./SessionLoadingScreen";

const STEP_1_MS = 420;
const STEP_2_MS = 860;
const STEP_3_MIN_MS = 1280;
const VICTORY_HOLD_MS = 380;
const FADE_OUT_MS = 320;
const SAFETY_TIMEOUT_MS = 15000;

type Phase = "visible" | "exiting" | "done";

const noopSubscribe = () => () => {};

/**
 * Se ejecuta únicamente una vez por sesión (al abrir sesión o entrar desde login/registro).
 * Mantiene una única combinación fija durante todo el arranque (1 de 3 loaders, 1 de 4 mensajes
 * motivadores y 3 de 12 checks) y guarda la marca en sessionStorage al terminar para que el resto
 * de la sesión sea instantánea y la siguiente sesión sortee una combinación distinta.
 */
export function SessionBootOverlay() {
  const alreadyBooted = useSyncExternalStore(noopSubscribe, isSessionBooted, () => false);
  const bootConfig = useSyncExternalStore(noopSubscribe, readOrCreateBootConfig, () => null);
  const initialSteps = useSyncExternalStore(noopSubscribe, readSessionBootSteps, () => 0);
  const [phase, setPhase] = useState<Phase>("visible");
  const [localSteps, setLocalSteps] = useState(0);
  const completedSteps = Math.max(initialSteps, localSteps);

  // Re-aplica atributos en <html> tras el remontaje de StrictMode en desarrollo.
  useLayoutEffect(() => {
    if (alreadyBooted) {
      document.documentElement.setAttribute(SESSION_BOOT_ATTR, "1");
    } else if (bootConfig) {
      document.documentElement.setAttribute(SESSION_BOOT_VARIANT_ATTR, String(bootConfig.variant));
    }
  }, [alreadyBooted, bootConfig]);

  useEffect(() => {
    if (alreadyBooted || phase !== "visible") return;

    const now = Date.now();
    const loginStart = readSessionBootStart();
    const elapsed = loginStart !== null ? Math.max(0, now - loginStart) : 0;
    const carriedSteps = readSessionBootSteps();

    let routeReady = false;
    let step3MinElapsed = false;
    let finishing = false;

    const timers: ReturnType<typeof setTimeout>[] = [];

    const advanceTo = (n: number) => {
      writeSessionBootSteps(n);
      setLocalSteps((prev) => Math.max(prev, n));
    };

    const finishAllSteps = () => {
      if (finishing) return;
      finishing = true;
      advanceTo(3);
      timers.push(
        setTimeout(() => {
          setPhase("exiting");
        }, VICTORY_HOLD_MS),
      );
    };

    const tryFinish = () => {
      if (routeReady && step3MinElapsed) finishAllSteps();
    };

    const checkRouteReady = () => {
      const main = document.querySelector("main");
      const ready = Boolean(main && main.childElementCount > 0 && !main.querySelector('[data-route-loading="true"]'));
      if (ready) {
        routeReady = true;
        tryFinish();
      }
      return ready;
    };

    if (carriedSteps < 1) {
      timers.push(
        setTimeout(() => {
          advanceTo(1);
        }, Math.max(0, STEP_1_MS - elapsed)),
      );
    }

    if (carriedSteps < 2) {
      timers.push(
        setTimeout(() => {
          advanceTo(2);
        }, Math.max(carriedSteps >= 1 ? 180 : 120, STEP_2_MS - elapsed)),
      );
    }

    timers.push(
      setTimeout(() => {
        step3MinElapsed = true;
        tryFinish();
      }, Math.max(260, STEP_3_MIN_MS - elapsed)),
    );

    timers.push(
      setTimeout(() => {
        routeReady = true;
        step3MinElapsed = true;
        finishAllSteps();
      }, SAFETY_TIMEOUT_MS),
    );

    let observer: MutationObserver | null = null;
    if (!checkRouteReady()) {
      const target = document.querySelector("main") ?? document.body;
      observer = new MutationObserver(() => {
        if (checkRouteReady()) observer?.disconnect();
      });
      observer.observe(target, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [alreadyBooted, phase]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const doneTimer = setTimeout(() => {
      markSessionBooted();
      setPhase("done");
    }, FADE_OUT_MS);
    return () => clearTimeout(doneTimer);
  }, [phase]);

  if (alreadyBooted || phase === "done") return null;

  const resolved = bootConfig ? resolveBootConfig(bootConfig) : null;

  return (
    <SessionLoadingScreen
      className="gp-boot-splash"
      variant={resolved?.variant}
      welcomeMessage={resolved?.welcomeMessage}
      steps={resolved?.steps}
      message="Cargando tu sesión…"
      completedSteps={completedSteps}
      settledSteps={initialSteps}
      fadingOut={phase === "exiting"}
    />
  );
}
