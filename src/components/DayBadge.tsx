import { activityEmoji, activityLabel } from "@/lib/kcal";
import type { DaySlot } from "@/lib/schedule";

function mainTitle(slot: DaySlot & { routineName?: string | null }) {
  if (slot.kind === "workout") return slot.routineName ?? "Rutina";
  if (slot.kind === "activity") return activityLabel(slot.activityType);
  return "Descanso";
}

/** "Pierna + Caminar + Elíptica" */
export function dayTitle(slot: DaySlot & { routineName?: string | null }) {
  return [mainTitle(slot), ...(slot.extraActivities ?? []).map(activityLabel)].join(" + ");
}

function mainEmoji(slot: DaySlot) {
  if (slot.kind === "workout") return "🏋️";
  if (slot.kind === "activity") return activityEmoji(slot.activityType);
  return "😴";
}

/** Un emoji por cosa planificada ese día. */
export function dayEmojis(slot: DaySlot): string[] {
  return [mainEmoji(slot), ...(slot.extraActivities ?? []).map(activityEmoji)];
}

export function dayEmoji(slot: DaySlot) {
  return dayEmojis(slot).join("");
}

export function slotColor(slot: DaySlot & { routineColor?: string | null }) {
  if (slot.kind === "workout") return slot.routineColor ?? "#f97316";
  if (slot.kind === "activity") return "#0ea5e9";
  return "#9ca3af";
}
