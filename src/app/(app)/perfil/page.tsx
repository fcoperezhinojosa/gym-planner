import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { headers } from "next/headers";
import { logout } from "@/app/actions";
import { ApiTokens } from "@/components/ApiTokens";
import { NativeRestTimerCard } from "@/components/NativeRestTimerCard";
import { NotificationsCard } from "@/components/NotificationsCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileForm } from "@/components/ProfileForm";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listApiTokens } from "@/lib/data";
import { getVapidPublicKey } from "@/lib/push";

export const metadata: Metadata = { title: "Perfil" };

const LINKS = [
  { href: "/cierre", label: "Cierre del día", desc: "Registrar rápido tus kcal y actividad de hoy" },
  { href: "/plan", label: "Plan semanal", desc: "Qué toca cada día y rotación A/B" },
  { href: "/ejercicios", label: "Ejercicios", desc: "Catálogo con imágenes y tu progresión" },
  { href: "/actividades", label: "Actividades", desc: "Gimnasio, pádel, caminar, elíptica…" },
];

async function getRequestBaseUrl() {
  "use cache: private";
  cacheLife({ stale: 300 });
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

async function ApiTokensSection({ userId }: { userId: number }) {
  const [tokens, baseUrl] = await Promise.all([listApiTokens(userId), getRequestBaseUrl()]);
  return (
    <Card className="p-4">
      <h2 className="mb-3 font-semibold">Acceso para IAs</h2>
      <ApiTokens baseUrl={baseUrl} tokens={tokens} />
    </Card>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <PageHeader title="Más" subtitle={user.email} />
      <ul className="space-y-2 md:hidden">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>
              <Card className="flex items-center justify-between p-4 hover:border-accent">
                <span>
                  <span className="block font-semibold">{l.label}</span>
                  <span className="block text-xs text-muted">{l.desc}</span>
                </span>
                <span className="text-muted">→</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <NativeRestTimerCard />
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Notificaciones</h2>
        <NotificationsCard
          reminderEnabled={user.reminderEnabled}
          reminderHour={user.reminderHour}
          reminderTimeZone={user.reminderTimeZone}
          vapidPublicKey={getVapidPublicKey()}
        />
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Perfil</h2>
        <ProfileForm
          name={user.name}
          weight={user.bodyWeightKg}
          sex={user.sex}
          birthYear={user.birthYear}
          heightCm={user.heightCm}
          dailyIntakeKcal={user.dailyIntakeKcal}
          defaultRestSeconds={user.defaultRestSeconds}
        />
      </Card>
      <Card className="p-4 md:hidden">
        <h2 className="mb-3 font-semibold">Apariencia</h2>
        <ThemeToggle />
      </Card>
      <Suspense fallback={<Card className="h-40 animate-pulse bg-card-2 p-4" />}>
        <ApiTokensSection userId={user.id} />
      </Suspense>
      <form action={logout}>
        <Button variant="secondary" className="w-full">Cerrar sesión</Button>
      </form>
    </div>
  );
}
