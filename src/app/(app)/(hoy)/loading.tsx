// Skeleton de Hoy: misma estructura que page.tsx para evitar saltos de layout.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-3.5 md:space-y-5" data-route-loading="true" aria-busy="true" aria-label="Cargando">
      <div className="flex items-end justify-between">
        <div className="space-y-1.5 md:space-y-2">
          <div className="h-4 w-44 rounded bg-card-2" />
          <div className="h-7 w-40 rounded-lg bg-card-2 md:h-8" />
        </div>
        <div className="h-7 w-20 rounded-full bg-card-2" />
      </div>
      <div className="mx-auto h-[244px] w-[244px] rounded-full bg-card-2 md:mt-2 md:h-[300px] md:w-[300px]" />
      <div className="h-14 rounded-full bg-card-2 md:h-16" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-[112px] rounded-[22px] bg-card-2 md:h-[140px] md:rounded-[26px]" />
        <div className="h-[112px] rounded-[22px] bg-card-2 md:h-[140px] md:rounded-[26px]" />
      </div>
      <div className="h-[114px] rounded-3xl bg-card-2 md:h-[130px]" />
    </div>
  );
}
