import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressChart } from "@/components/Charts";
import { Card, PageHeader, Pill, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { exerciseHistory, getExercise } from "@/lib/data";
import { formatShort } from "@/lib/dates";
import { CATEGORIES, equipmentLabel, exerciseImage, muscleLabel } from "@/lib/labels";
import { epley1RM } from "@/lib/stats";

export const metadata: Metadata = { title: "Ejercicio" };

export default async function ExercisePage({ params }: PageProps<"/ejercicios/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const ex = await getExercise(decodeURIComponent(id));
  if (!ex || (ex.ownerId !== null && ex.ownerId !== user.id)) notFound();
  const history = await exerciseHistory(user.id, ex.id);

  const bySession = new Map<number, { date: string; oneRm: number; top: number; volume: number; sets: number }>();
  for (const h of history) {
    const cur = bySession.get(h.sessionId) ?? { date: h.date, oneRm: 0, top: 0, volume: 0, sets: 0 };
    cur.oneRm = Math.max(cur.oneRm, epley1RM(h.weightKg, h.reps));
    cur.top = Math.max(cur.top, h.weightKg);
    cur.volume += h.weightKg * h.reps;
    cur.sets++;
    bySession.set(h.sessionId, cur);
  }
  const sessions = [...bySession.values()];
  const best1rm = Math.max(0, ...sessions.map((s) => s.oneRm));
  const bestTop = Math.max(0, ...sessions.map((s) => s.top));
  const bestVol = Math.max(0, ...sessions.map((s) => s.volume));

  return (
    <div className="space-y-4">
      <Link href="/ejercicios" className="inline-block text-sm text-muted hover:text-fg">← Ejercicios</Link>
      <PageHeader title={ex.nameEs ?? ex.name} subtitle={`${muscleLabel(ex.primaryMuscle)} · ${equipmentLabel(ex.equipment)}`} />
      {ex.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {ex.images.slice(0, 2).map((img) => (
            <img key={img} src={exerciseImage(img)!} alt={ex.name} className="aspect-[4/3] w-full rounded-2xl bg-white object-cover" />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Pill>{CATEGORIES[ex.category] ?? ex.category}</Pill>
        {ex.level && <Pill>{{ beginner: "Principiante", intermediate: "Intermedio", expert: "Avanzado" }[ex.level] ?? ex.level}</Pill>}
        {ex.mechanic && <Pill>{ex.mechanic === "compound" ? "Multiarticular" : "Aislamiento"}</Pill>}
        {ex.secondaryMuscles.map((m) => <Pill key={m}>{muscleLabel(m)}</Pill>)}
      </div>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="1RM estimado" value={best1rm ? `${best1rm} kg` : "—"} />
        <Stat label="Peso máximo" value={bestTop ? `${bestTop} kg` : "—"} />
        <Stat label="Mejor volumen" value={bestVol ? `${Math.round(bestVol)} kg` : "—"} />
      </section>

      {sessions.length > 1 && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Progresión</h2>
          <ProgressChart data={sessions.map((s) => ({ date: formatShort(s.date), oneRm: s.oneRm, top: s.top }))} />
        </Card>
      )}

      {sessions.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Historial</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="py-1 font-medium">Fecha</th><th className="font-medium">Series</th><th className="font-medium">Máx.</th><th className="text-right font-medium">1RM est.</th></tr>
            </thead>
            <tbody className="tabular">
              {[...sessions].reverse().slice(0, 20).map((s, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5">{formatShort(s.date)}</td><td>{s.sets}</td><td>{s.top} kg</td><td className="text-right">{s.oneRm} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {ex.instructions.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Cómo se hace</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
            {ex.instructions.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </Card>
      )}
    </div>
  );
}
