import { exerciseImage, muscleGroup, MUSCLE_GROUPS } from "@/lib/labels";
import { cx } from "./ui";

export function ExerciseThumb({ image, muscle, className }: { image: string | null; muscle: string; className?: string }) {
  const src = exerciseImage(image ?? undefined);
  const color = MUSCLE_GROUPS[muscleGroup(muscle)].color;
  return (
    <div className={cx("relative shrink-0 overflow-hidden rounded-xl bg-white", className ?? "h-14 w-14")} style={{ outline: `2px solid ${color}33` }}>
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-bold" style={{ background: `${color}22`, color }}>
          {MUSCLE_GROUPS[muscleGroup(muscle)].label[0]}
        </div>
      )}
    </div>
  );
}
