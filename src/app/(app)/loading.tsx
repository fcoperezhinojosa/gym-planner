export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-40 rounded-lg bg-card-2" />
      <div className="h-28 rounded-2xl bg-card-2" />
      <div className="h-20 rounded-2xl bg-card-2" />
      <div className="h-20 rounded-2xl bg-card-2" />
    </div>
  );
}
