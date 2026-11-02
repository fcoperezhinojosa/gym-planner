import { activityEmoji, activityLabel } from "@/lib/kcal";
import type { DaySlot } from "@/lib/schedule";

export function dayTitle(slot: DaySlot & { routineName?: string | null }) {
  if (slot.kind === "workout") return slot.routineName ?? "Rutina";
  if (slot.kind === "activity") return activityLabel(slot.activityType);
  return "Descanso";
}

export function dayEmoji(slot: DaySlot) {
  if (slot.kind === "workout") return "🏋️";
  if (slot.kind === "activity") return activityEmoji(slot.activityType);
  return "😴";
}

export function slotColor(slot: DaySlot & { routineColor?: string | null }) {
  if (slot.kind === "workout") return slot.routineColor ?? "#f97316";
  if (slot.kind === "activity") return "#0ea5e9";
  return "#9ca3af";
}
