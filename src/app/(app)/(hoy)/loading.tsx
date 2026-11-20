// Skeleton de Hoy: misma estructura que page.tsx para evitar saltos de layout.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" data-route-loading="true" aria-busy="true" aria-label="Cargando">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-4 w-44 rounded bg-card-2" />
          <div className="h-8 w-40 rounded-lg bg-card-2" />
        </div>
        <div className="h-7 w-20 rounded-full bg-card-2" />
      </div>
      <div className="mx-auto mt-2 h-[300px] w-[300px] rounded-full bg-card-2" />
      <div className="h-16 rounded-full bg-card-2" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-[140px] rounded-[26px] bg-card-2" />
        <div className="h-[140px] rounded-[26px] bg-card-2" />
      </div>
      <div className="h-[130px] rounded-3xl bg-card-2" />
    </div>
  );
}
