import { Card } from "@/components/ui";

export default function DailyCheckinLoading() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-card-2" />
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="h-20 animate-pulse bg-card-2 p-4" />
        <Card className="h-20 animate-pulse bg-card-2 p-4" />
      </div>
      <Card className="h-44 animate-pulse bg-card-2 p-4" />
      <Card className="h-64 animate-pulse bg-card-2 p-4" />
    </div>
  );
}
