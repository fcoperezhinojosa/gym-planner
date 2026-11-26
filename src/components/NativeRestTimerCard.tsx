"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getNativeRestPermissions,
  getNativeRestPreferences,
  isNativeRestTimerAvailable,
  requestNativeBatteryOptimization,
  requestNativeNotificationPermission,
  requestNativeOverlayPermission,
  resetNativePillPosition,
  setNativeRestPreferences,
  startNativeRestTimer,
  stopNativeRestTimer,
  type NativeRestPermissions,
  type NativeRestPreferences,
} from "@/lib/native-rest-timer";
import { toast } from "./Toast";
import { Button, Card, input, label } from "./ui";

const MIN_SECOND_OPTIONS = [
  { value: 0, label: "En todos los descansos" },
  { value: 45, label: "Solo descansos de 45 s o más" },
  { value: 60, label: "Solo descansos de 1 min o más" },
];

export function NativeRestTimerCard() {
  const [available, setAvailable] = useState(false);
  const [perms, setPerms] = useState<NativeRestPermissions | null>(null);
  const [prefs, setPrefs] = useState<NativeRestPreferences | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    const [p, cfg] = await Promise.all([getNativeRestPermissions(), getNativeRestPreferences()]);
    if (p) setPerms(p);
    if (cfg) setPrefs(cfg);
  }, []);

  useEffect(() => {
    if (!isNativeRestTimerAvailable()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(true);
    void refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onFocus = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  if (!available) return null;

  async function updatePref(patch: Partial<NativeRestPreferences>) {
    const updated = await setNativeRestPreferences(patch);
    if (updated) setPrefs(updated);
  }

  async function runTestPill() {
    setTesting(true);
    const ok = await startNativeRestTimer({
      endAtMs: Date.now() + 10_000,
      totalSec: 10,
      exerciseName: "Press banca (prueba)",
      setLabel: "Serie 2/4",
      sessionId: 0,
      sessionUrl: "/perfil",
      forceOverlay: true,
    });
    if (ok) {
      toast("Prueba de 10 s iniciada · cambia a YouTube o Google para probarla");
      window.setTimeout(() => setTesting(false), 10_500);
    } else {
      setTesting(false);
      toast("No se pudo iniciar la prueba", "danger");
    }
  }

  async function stopTestPill() {
    await stopNativeRestTimer();
    setTesting(false);
    toast("Prueba detenida");
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Temporizador flotante (Android)</h2>
          <p className="text-xs text-muted">
            Muestra la cuenta atrás arriba cuando sales a Google o YouTube y suena al acabar sin pausar el vídeo.
          </p>
        </div>
      </div>

      {perms && (
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Permisos necesarios</p>

          <PermissionRow
            title="Mostrar sobre otras apps"
            desc="Necesario para ver la pastilla flotante encima de YouTube y Google"
            granted={perms.overlay}
            actionLabel="Activar"
            onAction={async () => {
              await requestNativeOverlayPermission();
            }}
          />

          <PermissionRow
            title="Notificaciones"
            desc="Mantiene el contador en segundo plano y avisa al terminar"
            granted={perms.notifications}
            actionLabel="Activar"
            onAction={async () => {
              const next = await requestNativeNotificationPermission();
              if (next) setPerms(next);
            }}
          />

          <PermissionRow
            title="Batería sin restricciones"
            desc="Recomendado en OnePlus / OxygenOS para que no congele el aviso"
            granted={perms.batteryUnrestricted}
            actionLabel="Permitir"
            optional
            onAction={async () => {
              await requestNativeBatteryOptimization();
            }}
          />
        </div>
      )}

      {prefs && (
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Pastilla flotante arriba</span>
              <span className="block text-xs text-muted">Aparece automáticamente al salir de Gym Planner</span>
            </span>
            <input
              type="checkbox"
              checked={prefs.overlayEnabled}
              onChange={(e) => void updatePref({ overlayEnabled: e.target.checked })}
              className="h-5 w-5 accent-accent"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Sonido al acabar</span>
              <span className="block text-xs text-muted">
                Baja un instante el volumen de YouTube sin pausar el vídeo; suena también con auriculares
              </span>
            </span>
            <input
              type="checkbox"
              checked={prefs.soundEnabled}
              onChange={(e) => void updatePref({ soundEnabled: e.target.checked })}
              className="h-5 w-5 accent-accent"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Vibración al acabar</span>
              <span className="block text-xs text-muted">Triple pulso corto al llegar a 0:00</span>
            </span>
            <input
              type="checkbox"
              checked={prefs.vibrateEnabled}
              onChange={(e) => void updatePref({ vibrateEnabled: e.target.checked })}
              className="h-5 w-5 accent-accent"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Sonar incluso en modo silencio</span>
              <span className="block text-xs text-muted">Si está desactivado, en silencio solo vibra (salvo con cascos)</span>
            </span>
            <input
              type="checkbox"
              checked={prefs.soundInSilentMode}
              onChange={(e) => void updatePref({ soundInSilentMode: e.target.checked })}
              className="h-5 w-5 accent-accent"
            />
          </label>

          <div>
            <label className={label} htmlFor="nativeMinSeconds">
              Cuándo mostrar el temporizador externo
            </label>
            <select
              id="nativeMinSeconds"
              value={prefs.minSeconds}
              onChange={(e) => void updatePref({ minSeconds: Number(e.target.value) })}
              className={input}
            >
              {MIN_SECOND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {!testing ? (
          <Button type="button" size="sm" onClick={() => void runTestPill()}>
            Probar pastilla (10 s)
          </Button>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={() => void stopTestPill()}>
            Detener prueba
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={async () => {
            await resetNativePillPosition();
            toast("Posición de la pastilla restablecida arriba");
          }}
        >
          Centrar posición
        </Button>
      </div>
    </Card>
  );
}

function PermissionRow({
  title,
  desc,
  granted,
  actionLabel,
  optional = false,
  onAction,
}: {
  title: string;
  desc: string;
  granted: boolean;
  actionLabel: string;
  optional?: boolean;
  onAction: () => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      {granted ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-good/15 px-2.5 py-1 text-xs font-semibold text-good">
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          Activo
        </span>
      ) : (
        <Button
          type="button"
          size="sm"
          variant={optional ? "secondary" : "primary"}
          onClick={() => void onAction()}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
