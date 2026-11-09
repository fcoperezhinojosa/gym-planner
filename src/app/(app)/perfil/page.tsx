import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { logout } from "@/app/actions";
import { ApiTokens } from "@/components/ApiTokens";
import { getDb, schema } from "@/db";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileForm } from "@/components/ProfileForm";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Perfil" };

const LINKS = [
  { href: "/plan", label: "Plan semanal", desc: "Qué toca cada día y rotación A/B" },
  { href: "/ejercicios", label: "Ejercicios", desc: "Catálogo con imágenes y tu progresión" },
  { href: "/actividades", label: "Actividades", desc: "Gimnasio, pádel, caminar, elíptica…" },
];

export default async function ProfilePage() {
  const user = await requireUser();
  const db = await getDb();
  const tokens = await db
    .select({ id: schema.apiTokens.id, name: schema.apiTokens.name, scope: schema.apiTokens.scope, createdAt: schema.apiTokens.createdAt, lastUsedAt: schema.apiTokens.lastUsedAt })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.userId, user.id));
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const baseUrl = (process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`).replace(/\/$/, "");
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
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Acceso para IAs</h2>
        <ApiTokens
          baseUrl={baseUrl}
          tokens={tokens.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), lastUsedAt: t.lastUsedAt?.toISOString() ?? null }))}
        />
      </Card>
      <form action={logout}>
        <Button variant="secondary" className="w-full">Cerrar sesión</Button>
      </form>
    </div>
  );
}
