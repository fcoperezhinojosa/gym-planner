// Skeleton de Hoy: misma estructura que page.tsx para evitar saltos de layout.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2 px-1">
        <div className="h-4 w-44 rounded bg-card-2" />
        <div className="h-8 w-40 rounded-lg bg-card-2" />
      </div>
      <div className="h-[330px] rounded-[28px] bg-card-2" />
      <div className="space-y-3 rounded-[24px] border border-line px-[18px] py-4">
        <div className="flex justify-between">
          <div className="h-5 w-32 rounded bg-card-2" />
          <div className="h-4 w-36 rounded bg-card-2" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-full bg-card-2" />
          <div className="h-10 w-10 rounded-full bg-card-2" />
          <div className="h-10 w-10 rounded-full bg-card-2" />
          <div className="h-12 w-12 rounded-full bg-card-2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-card-2" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-[108px] rounded-[20px] bg-card-2" />
          <div className="h-[108px] rounded-[20px] bg-card-2" />
          <div className="h-[108px] rounded-[20px] bg-card-2" />
        </div>
      </div>
    </div>
  );
}
