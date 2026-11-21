"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ExerciseLite } from "@/lib/data";
import { seedExerciseCatalogCache } from "@/lib/exercise-catalog-client";
import { EQUIPMENT, MUSCLES, equipmentLabel, muscleLabel } from "@/lib/labels";
import { withBackParams } from "@/lib/navigation";
import { normalize } from "@/lib/text";
import { ExerciseThumb } from "./ExerciseThumb";
import { Button, Card, LinkButton, PageHeader, input } from "./ui";

const PAGE = 60;

function buildCatalogHref(q: string, muscle: string, equipment: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (muscle) params.set("muscle", muscle);
  if (equipment) params.set("equipment", equipment);
  if (page > 1) params.set("p", String(page));
  const qs = params.toString();
  return qs ? `/ejercicios?${qs}` : "/ejercicios";
}

export function ExercisesCatalog({ exercises }: { exercises: ExerciseLite[] }) {
  const sp = useSearchParams();
  const [q, setQ] = useState(() => sp.get("q") ?? "");
  const [muscle, setMuscle] = useState(() => sp.get("muscle") ?? "");
  const [equipment, setEquipment] = useState(() => sp.get("equipment") ?? "");
  const [page, setPage] = useState(() => Math.max(1, Number(sp.get("p")) || 1));

  useEffect(() => {
    seedExerciseCatalogCache(exercises);
  }, [exercises]);

  const currentListHref = useMemo(
    () => buildCatalogHref(q, muscle, equipment, page),
    [q, muscle, equipment, page],
  );

  useEffect(() => {
    window.history.replaceState(null, "", currentListHref);
  }, [currentListHref]);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    return exercises.filter(
      (e) =>
        (!muscle || e.primaryMuscle === muscle) &&
        (!equipment || e.equipment === equipment) &&
        (!nq || normalize(e.name).includes(nq)),
    );
  }, [exercises, q, muscle, equipment]);

  const shown = useMemo(() => filtered.slice(0, page * PAGE), [filtered, page]);
  const hasFilters = Boolean(q || muscle || equipment);
  const hasBackContext = hasFilters || page > 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ejercicios"
        subtitle={`${filtered.length} de ${exercises.length}`}
        action={<LinkButton href="/ejercicios/nuevo" size="sm" variant="secondary">+ Propio</LinkButton>}
      />
      <form
        className="grid gap-2 sm:grid-cols-[1fr_11rem_11rem_auto]"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className={input}
          placeholder="Buscar…"
          aria-label="Buscar"
        />
        <select
          name="muscle"
          value={muscle}
          onChange={(e) => {
            setMuscle(e.target.value);
            setPage(1);
          }}
          className={input}
          aria-label="Músculo"
        >
          <option value="">Todos los músculos</option>
          {Object.entries(MUSCLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          name="equipment"
          value={equipment}
          onChange={(e) => {
            setEquipment(e.target.value);
            setPage(1);
          }}
          className={input}
          aria-label="Material"
        >
          <option value="">Todo el material</option>
          {Object.entries(EQUIPMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {hasFilters && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setQ("");
              setMuscle("");
              setEquipment("");
              setPage(1);
            }}
          >
            Limpiar
          </Button>
        )}
      </form>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((e) => (
          <li key={e.id}>
            <Link href={hasBackContext ? withBackParams(`/ejercicios/${encodeURIComponent(e.id)}`, currentListHref, "Ejercicios") : `/ejercicios/${encodeURIComponent(e.id)}`}>
              <Card className="flex items-center gap-3 p-2 transition hover:border-accent">
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
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">Sin resultados</p>
      )}
      {shown.length < filtered.length && (
        <div className="text-center">
          <Button type="button" variant="secondary" onClick={() => setPage((p) => p + 1)}>
            Ver más
          </Button>
        </div>
      )}
      <p className="text-center text-xs text-muted">
        Catálogo e imágenes: <a className="underline" href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">free-exercise-db</a> (dominio público).
      </p>
    </div>
  );
}
