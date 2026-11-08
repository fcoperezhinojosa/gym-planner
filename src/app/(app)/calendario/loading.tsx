/** Skeleton con la forma real del calendario (cabecera, rejilla 7×6 y detalle del día). */
export default function CalendarLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando calendario">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-card-2" />
          <div className="h-4 w-56 rounded bg-card-2" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-card-2" />
      </div>
      <div className="rounded-2xl border border-line bg-card p-2">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }, (_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-card-2" />
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-card-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-card-2" />
            <div className="h-5 w-40 rounded bg-card-2" />
          </div>
        </div>
        <div className="h-9 rounded-xl bg-card-2" />
      </div>
    </div>
  );
}
