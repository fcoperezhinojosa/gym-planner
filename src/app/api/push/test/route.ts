import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPushConfigured, sendPushToUser } from "@/lib/push";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Faltan las claves VAPID en el servidor" },
      { status: 503 },
    );
  }

  try {
    const result = await sendPushToUser(user.id, {
      title: "Notificaciones activas",
      body: "Así te avisaré al final del día para registrar tu actividad y las kcal.",
      url: "/cierre",
      tag: "test-notification",
    });

    if (result.sent === 0) {
      if (result.failed > 0) {
        return NextResponse.json(
          { error: `Error al enviar la notificación: ${result.lastError ?? "fallo del servicio push"}` },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: "No hay ningún dispositivo suscrito activo. Vuelve a activar las notificaciones." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[push/test] Error inesperado:", err);
    const message = err instanceof Error ? err.message : "Error inesperado en el servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
