"use client";

import { useActionState, useEffect, useState } from "react";
import { updateReminderSettings } from "@/app/actions";
import { toast } from "./Toast";
import { Button, cx, input, label } from "./ui";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00 a 23:00

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushStatus = "checking" | "unsupported" | "unconfigured" | "denied" | "unsubscribed" | "subscribed";

export function NotificationsCard({
  reminderEnabled,
  reminderHour,
  reminderTimeZone,
  vapidPublicKey,
}: {
  reminderEnabled: boolean;
  reminderHour: number;
  reminderTimeZone: string;
  vapidPublicKey?: string;
}) {
  const effectiveVapidKey = (vapidPublicKey ?? VAPID_PUBLIC_KEY).trim().replace(/^['"]|['"]$/g, "");
  const [status, setStatus] = useState<PushStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [detectedTz, setDetectedTz] = useState(reminderTimeZone);

  const [state, action, pending] = useActionState(updateReminderSettings, undefined);

  useEffect(() => {
    if (state?.ok) toast("Preferencias de recordatorio guardadas");
  }, [state]);

  useEffect(() => {
    let active = true;

    async function check() {
      let tz = reminderTimeZone;
      try {
        const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (resolved) tz = resolved;
      } catch {}

      let nextStatus: PushStatus = "unsubscribed";
      if (!effectiveVapidKey) {
        nextStatus = "unconfigured";
      } else if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        nextStatus = "unsupported";
      } else if (Notification.permission === "denied") {
        nextStatus = "denied";
      } else {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = (await reg?.pushManager.getSubscription()) ?? null;
          nextStatus = sub ? "subscribed" : "unsubscribed";
        } catch {
          nextStatus = "unsubscribed";
        }
      }

      if (!active) return;
      setDetectedTz(tz);
      setStatus(nextStatus);
    }

    void check();
    return () => {
      active = false;
    };
  }, [reminderTimeZone, effectiveVapidKey]);

  async function enablePush() {
    setBusy(true);
    setPushError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js");
      }
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(effectiveVapidKey),
        });
      }

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          timeZone: detectedTz,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo guardar la suscripción");
      }

      setStatus("subscribed");
      toast("Notificaciones activadas en este dispositivo");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "No se pudieron activar las notificaciones");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setPushError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
      toast("Notificaciones desactivadas en este dispositivo");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "No se pudieron desactivar");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setPushError(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo enviar la prueba");
      toast("Notificación de prueba enviada");
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Error enviando la prueba");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted">
          Recibe un aviso al final del día si aún no has registrado tus kcal o alguna actividad. Al tocarlo se abrirá{" "}
          <strong className="text-fg">Cierre del día</strong> para añadirlo en segundos.
        </p>

        {status === "unconfigured" && (
          <p className="rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-fg">
            Falta configurar las claves VAPID en el servidor (<code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> y{" "}
            <code>VAPID_PRIVATE_KEY</code>).
          </p>
        )}

        {status === "unsupported" && (
          <p className="rounded-xl border border-line bg-card-2 px-3 py-2 text-xs text-muted">
            Este navegador no soporta notificaciones Web Push. En Android usa Chrome con la app instalada; en iPhone
            instálala primero en la pantalla de inicio (iOS 16.4+).
          </p>
        )}

        {status === "denied" && (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            Las notificaciones están bloqueadas en este dispositivo. Actívalas en los ajustes del navegador o de la app
            en Android y vuelve a intentarlo.
          </p>
        )}

        {status === "unsubscribed" && (
          <Button type="button" onClick={enablePush} disabled={busy}>
            {busy ? "Activando…" : "Activar notificaciones en este dispositivo"}
          </Button>
        )}

        {status === "subscribed" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-good/15 px-3 py-1 text-xs font-semibold text-good">
              <span className="h-2 w-2 rounded-full bg-good" />
              Activas en este dispositivo
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={sendTest} disabled={testing || busy}>
              {testing ? "Enviando…" : "Probar aviso"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={disablePush} disabled={busy || testing}>
              Desactivar aquí
            </Button>
          </div>
        )}

        {pushError && <p className="text-sm text-danger">{pushError}</p>}
      </div>

      <form
        key={`${reminderEnabled}|${reminderHour}|${reminderTimeZone}`}
        action={action}
        className={cx("space-y-3 border-t border-line pt-4")}
      >
        <input type="hidden" name="reminderTimeZone" value={detectedTz} />
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium">Recordatorio diario</span>
            <span className="block text-xs text-muted">Solo avisa si hoy falta registrar kcal o actividad</span>
          </span>
          <input
            type="checkbox"
            name="reminderEnabled"
            defaultChecked={reminderEnabled}
            className="h-5 w-5 accent-accent"
          />
        </label>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className={label} htmlFor="reminderHour">
              Hora del aviso ({detectedTz})
            </label>
            <select id="reminderHour" name="reminderHour" defaultValue={reminderHour} className={input}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <Button disabled={pending}>Guardar</Button>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="text-sm text-good">Guardado ✓</p>}
      </form>
    </div>
  );
}
