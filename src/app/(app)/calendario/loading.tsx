import { Card } from "@/components/ui";
import { WEEKDAYS_SHORT } from "@/lib/labels";

export default function CalendarLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando calendario">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-card-2" />
          <div className="h-4 w-56 animate-pulse rounded-md bg-card-2" />
        </div>
        <div className="flex gap-1">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-card-2" />
          <div className="h-9 w-14 animate-pulse rounded-lg bg-card-2" />
          <div className="h-9 w-9 animate-pulse rounded-lg bg-card-2" />
        </div>
      </div>

      <Card className="p-2">
        <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS_SHORT.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-card-2/70" />
          ))}
        </div>
        <div className="flex gap-3 px-2 pt-2">
          <div className="h-3 w-16 animate-pulse rounded bg-card-2" />
          <div className="h-3 w-16 animate-pulse rounded bg-card-2" />
          <div className="h-3 w-20 animate-pulse rounded bg-card-2" />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-card-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-28 animate-pulse rounded bg-card-2" />
            <div className="h-5 w-44 animate-pulse rounded bg-card-2" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-8 w-36 animate-pulse rounded-xl bg-card-2" />
          <div className="h-8 w-24 animate-pulse rounded-xl bg-card-2" />
        </div>
      </Card>
    </div>
  );
}
