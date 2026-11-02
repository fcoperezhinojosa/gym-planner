/** Etiquetas en español y agrupaciones. Los códigos vienen de free-exercise-db. */

export const MUSCLES: Record<string, { label: string; group: MuscleGroup }> = {
  chest: { label: "Pecho", group: "pecho" },
  lats: { label: "Dorsales", group: "espalda" },
  "middle back": { label: "Espalda media", group: "espalda" },
  "lower back": { label: "Lumbares", group: "espalda" },
  traps: { label: "Trapecio", group: "espalda" },
  shoulders: { label: "Hombros", group: "hombro" },
  biceps: { label: "Bíceps", group: "brazo" },
  triceps: { label: "Tríceps", group: "brazo" },
  forearms: { label: "Antebrazos", group: "brazo" },
  quadriceps: { label: "Cuádriceps", group: "pierna" },
  hamstrings: { label: "Isquiotibiales", group: "pierna" },
  glutes: { label: "Glúteos", group: "pierna" },
  calves: { label: "Gemelos", group: "pierna" },
  adductors: { label: "Aductores", group: "pierna" },
  abductors: { label: "Abductores", group: "pierna" },
  abdominals: { label: "Abdominales", group: "core" },
  neck: { label: "Cuello", group: "hombro" },
};

export type MuscleGroup = "pecho" | "espalda" | "hombro" | "brazo" | "pierna" | "core";

export const MUSCLE_GROUPS: Record<MuscleGroup, { label: string; color: string }> = {
  pecho: { label: "Pecho", color: "#f97316" },
  espalda: { label: "Espalda", color: "#3b82f6" },
  hombro: { label: "Hombro", color: "#a855f7" },
  brazo: { label: "Brazo", color: "#ec4899" },
  pierna: { label: "Pierna", color: "#22c55e" },
  core: { label: "Core", color: "#eab308" },
};

export const EQUIPMENT: Record<string, string> = {
  dumbbell: "Mancuernas",
  machine: "Máquina",
  barbell: "Barra",
  cable: "Polea",
  "body only": "Peso corporal",
  kettlebells: "Kettlebell",
  bands: "Bandas",
  "e-z curl bar": "Barra Z",
  "medicine ball": "Balón medicinal",
  "exercise ball": "Fitball",
  "foam roll": "Foam roller",
  other: "Otro",
};

export const CATEGORIES: Record<string, string> = {
  strength: "Fuerza",
  stretching: "Estiramiento",
  plyometrics: "Pliometría",
  powerlifting: "Powerlifting",
  "olympic weightlifting": "Halterofilia",
  strongman: "Strongman",
  cardio: "Cardio",
};

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function muscleLabel(code: string) {
  return MUSCLES[code]?.label ?? code;
}
export function muscleGroup(code: string): MuscleGroup {
  return MUSCLES[code]?.group ?? "core";
}
export function equipmentLabel(code: string) {
  return EQUIPMENT[code] ?? code;
}

export const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export function exerciseImage(path: string | undefined) {
  if (!path) return null;
  return path.startsWith("http") ? path : IMAGE_BASE + path;
}
