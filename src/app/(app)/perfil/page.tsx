import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Perfil" };

const LINKS = [
  { href: "/plan", label: "Plan semanal", desc: "Qué toca cada día y rotación A/B" },
  { href: "/ejercicios", label: "Ejercicios", desc: "Catálogo con imágenes y tu progresión" },
  { href: "/actividades", label: "Actividades", desc: "Pádel, correr, bici…" },
];

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
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Perfil</h2>
        <ProfileForm name={user.name} weight={user.bodyWeightKg} />
      </Card>
      <form action={logout}>
        <Button variant="secondary" className="w-full">Cerrar sesión</Button>
      </form>
    </div>
  );
}
