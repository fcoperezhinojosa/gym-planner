import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { Button, Card, LinkButton, PageHeader, input } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listExercisesLite } from "@/lib/data";
import { EQUIPMENT, MUSCLES, equipmentLabel, muscleLabel } from "@/lib/labels";
import { normalize } from "@/lib/text";

export const metadata: Metadata = { title: "Ejercicios" };

const PAGE = 60;

export default async function ExercisesPage({ searchParams }: PageProps<"/ejercicios">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const muscle = typeof sp.muscle === "string" ? sp.muscle : "";
  const equipment = typeof sp.equipment === "string" ? sp.equipment : "";
  const page = Math.max(1, Number(sp.p) || 1);
  const all = await listExercisesLite(user.id);
  const nq = normalize(q);
  const filtered = all.filter(
    (e) => (!muscle || e.primaryMuscle === muscle) && (!equipment || e.equipment === equipment) && (!nq || normalize(e.name).includes(nq)),
  );
  const shown = filtered.slice(0, page * PAGE);
  const qs = (p: number) => `/ejercicios?${new URLSearchParams({ q, muscle, equipment, p: String(p) })}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Ejercicios" subtitle={`${filtered.length} de ${all.length}`} action={<LinkButton href="/ejercicios/nuevo" size="sm" variant="secondary">+ Propio</LinkButton>} />
      <form className="grid gap-2 sm:grid-cols-[1fr_11rem_11rem_auto]">
        <input name="q" defaultValue={q} className={input} placeholder="Buscar…" aria-label="Buscar" />
        <select name="muscle" defaultValue={muscle} className={input} aria-label="Músculo">
          <option value="">Todos los músculos</option>
          {Object.entries(MUSCLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="equipment" defaultValue={equipment} className={input} aria-label="Material">
          <option value="">Todo el material</option>
          {Object.entries(EQUIPMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button variant="secondary">Filtrar</Button>
      </form>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((e) => (
          <li key={e.id}>
            <Link href={`/ejercicios/${encodeURIComponent(e.id)}`}>
              <Card className="flex items-center gap-3 p-2 hover:border-accent">
                <ExerciseThumb image={e.image} muscle={e.primaryMuscle} className="h-20 w-20" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{e.name}</span>
                  <span className="block text-xs text-muted">{muscleLabel(e.primaryMuscle)} · {equipmentLabel(e.equipment)}</span>
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length < filtered.length && (
        <div className="text-center">
          <LinkButton href={qs(page + 1)} variant="secondary" scroll={false}>Ver más</LinkButton>
        </div>
      )}
      <p className="text-center text-xs text-muted">
        Catálogo e imágenes: <a className="underline" href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">free-exercise-db</a> (dominio público).
      </p>
    </div>
  );
}
