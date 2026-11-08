import "server-only";
import {
  ApiError,
  createExercise,
  createRoutineApi,
  getAnalyticsApi,
  getCalendarApi,
  getDayApi,
  getExerciseApi,
  getPlanApi,
  setPlanApi,
  setPlanDayApi,
  listRoutinesApi,
  metaApi,
  routineView,
  searchExercises,
  updateRoutineApi,
} from "./api-core";
import type { ApiPrincipal } from "./api-tokens";

type Args = Record<string, unknown>;
type Ctx = { principal: ApiPrincipal; baseUrl: string };

export interface Tool {
  name: string;
  description: string;
  /** JSON Schema de los argumentos (se reutiliza en MCP y en OpenAPI). */
  inputSchema: Record<string, unknown>;
  /** true = modifica datos y exige un token con permiso "edit". */
  write: boolean;
  run: (args: Args, ctx: Ctx) => Promise<unknown>;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const numOf = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Number(v));
const idOf = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "id no válido");
  return n;
};

const setsSchema = {
  type: "array",
  description: "Series. Alternativa a setsCount/reps/weightKg.",
  items: {
    type: "object",
    properties: {
      reps: { type: "integer", minimum: 1 },
      weightKg: { type: "number", minimum: 0 },
      type: { type: "string", enum: ["normal", "warmup", "dropset", "failure"] },
    },
    required: ["reps"],
  },
};

const routineExercisesSchema = {
  type: "array",
  description: "Ejercicios en orden. Usa ids de search_exercises (o crea uno con create_exercise).",
  items: {
    type: "object",
    properties: {
      exerciseId: { type: "string" },
      setsCount: { type: "integer", minimum: 1, maximum: 30, description: "Nº de series iguales (por defecto 3)" },
      reps: { type: "integer", minimum: 1, description: "Reps por serie si usas setsCount (por defecto 10)" },
      weightKg: { type: "number", minimum: 0, description: "Peso por serie si usas setsCount (por defecto 0)" },
      sets: setsSchema,
      restSeconds: { type: "integer", minimum: 0, maximum: 900, description: "Descanso entre series (por defecto 90)" },
      notes: { type: "string" },
    },
    required: ["exerciseId"],
  },
};

export const TOOLS: Tool[] = [
  {
    name: "get_today",
    description:
      "Qué toca hoy (o en `date`): gimnasio con la rutina completa, actividad o descanso, lo ya hecho y un `link` listo para enviar al usuario que abre la rutina del día en la app.",
    inputSchema: { type: "object", properties: { date: { type: "string", description: "AAAA-MM-DD. Por defecto, hoy." } } },
    write: false,
    run: (a, { principal, baseUrl }) => getDayApi(principal.user.id, str(a.date), baseUrl),
  },
  {
    name: "get_calendar",
    description: "Plan y lo hecho de un rango de días (por defecto la semana actual, 7 días; máx. 62).",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string", description: "AAAA-MM-DD" }, days: { type: "integer", minimum: 1, maximum: 62 } },
    },
    write: false,
    run: (a, { principal, baseUrl }) => getCalendarApi(principal.user.id, str(a.from), numOf(a.days), baseUrl),
  },
  {
    name: "get_plan",
    description: "Plan semanal activo: ciclo de semanas (A/B…) y qué toca cada día.",
    inputSchema: { type: "object", properties: {} },
    write: false,
    run: (_a, { principal }) => getPlanApi(principal.user.id),
  },
  {
    name: "get_analytics",
    description:
      "Análisis de entrenamiento: por semana días planificados/entrenados, minutos y kcal; cumplimiento; series y volumen por grupo muscular (últimas 4 semanas); récords (1RM estimado).",
    inputSchema: { type: "object", properties: { weeks: { type: "integer", minimum: 1, maximum: 26, description: "Por defecto 8" } } },
    write: false,
    run: (a, { principal }) => getAnalyticsApi(principal.user.id, numOf(a.weeks)),
  },
  {
    name: "search_exercises",
    description: "Busca en el catálogo (~870 ejercicios en español + los propios del usuario). Devuelve ids para usar en las rutinas.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Texto del nombre, en español o inglés" },
        muscle: { type: "string", description: "Código de músculo (ver get_meta), p. ej. chest, lats, quadriceps" },
        equipment: { type: "string", description: "Código de material (ver get_meta), p. ej. dumbbell, barbell, machine" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
    },
    write: false,
    run: (a, { principal }) => searchExercises(principal.user.id, { q: str(a.q), muscle: str(a.muscle), equipment: str(a.equipment), limit: numOf(a.limit) }),
  },
  {
    name: "get_exercise",
    description: "Detalle de un ejercicio: músculos e instrucciones.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    write: false,
    run: (a, { principal }) => getExerciseApi(principal.user.id, String(a.id ?? "")),
  },
  {
    name: "get_meta",
    description: "Valores válidos de músculo y material para crear ejercicios, y tipos de serie.",
    inputSchema: { type: "object", properties: {} },
    write: false,
    run: async () => metaApi(),
  },
  {
    name: "list_routines",
    description: "Rutinas del usuario con su enlace.",
    inputSchema: { type: "object", properties: {} },
    write: false,
    run: (_a, { principal, baseUrl }) => listRoutinesApi(principal.user.id, baseUrl),
  },
  {
    name: "get_routine",
    description: "Una rutina con todos sus ejercicios y series.",
    inputSchema: { type: "object", properties: { id: { type: "integer" } }, required: ["id"] },
    write: false,
    run: (a, { principal, baseUrl }) => routineView(principal.user.id, idOf(a.id), baseUrl),
  },
  {
    name: "create_exercise",
    description: "Crea un ejercicio propio si no existe en el catálogo (busca antes con search_exercises). Devuelve su id.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        primaryMuscle: { type: "string", description: "Código de músculo (ver get_meta)" },
        equipment: { type: "string", description: "Código de material (ver get_meta). Por defecto other" },
        instructions: { type: "array", items: { type: "string" } },
        image: { type: "string", description: "URL https opcional" },
      },
      required: ["name", "primaryMuscle"],
    },
    write: true,
    run: (a, { principal }) => createExercise(principal.user.id, a),
  },
  {
    name: "create_routine",
    description: "Crea una rutina con sus ejercicios y series. Devuelve la rutina y su `url`.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        color: { type: "string", description: "#rrggbb" },
        notes: { type: "string" },
        exercises: routineExercisesSchema,
      },
      required: ["name"],
    },
    write: true,
    run: (a, { principal, baseUrl }) => createRoutineApi(principal.user.id, a, baseUrl),
  },
  {
    name: "update_routine",
    description:
      "Modifica una rutina. Si envías `exercises`, REEMPLAZA todos los ejercicios (envía la lista completa). Sin `exercises` solo cambia nombre/color/notas.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        color: { type: "string" },
        notes: { type: "string" },
        exercises: routineExercisesSchema,
      },
      required: ["id"],
    },
    write: true,
    run: (a, { principal, baseUrl }) => updateRoutineApi(principal.user.id, idOf(a.id), a, baseUrl),
  },
  {
    name: "set_plan",
    description: "Crea o actualiza el plan semanal activo: nombre, fecha de inicio y nº de semanas del ciclo (1–8; 2 = rotación A/B).",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" }, startDate: { type: "string", description: "AAAA-MM-DD" }, cycleWeeks: { type: "integer", minimum: 1, maximum: 8 } },
    },
    write: true,
    run: (a, { principal }) => setPlanApi(principal.user.id, a),
  },
  {
    name: "set_plan_day",
    description: "Define qué toca un día del plan: gimnasio con una rutina, una actividad (padel, running…) o descanso, más actividades extra opcionales. Requiere plan activo (set_plan).",
    inputSchema: {
      type: "object",
      properties: {
        week: { type: "string", description: "Semana del ciclo: A, B… (por defecto A)" },
        weekday: { type: "integer", minimum: 1, maximum: 7, description: "1 = lunes … 7 = domingo" },
        kind: { type: "string", enum: ["workout", "activity", "rest"] },
        routineId: { type: "integer", description: "Obligatorio si kind = workout" },
        activityType: { type: "string", description: "Obligatorio si kind = activity" },
        extraActivities: {
          type: "array",
          items: { type: "string" },
          description: "Actividades adicionales ese día (p. ej. [\"walking\"] para gimnasio + caminar). Máx. 4.",
        },
        label: { type: "string" },
      },
      required: ["weekday", "kind"],
    },
    write: true,
    run: (a, { principal }) => setPlanDayApi(principal.user.id, a),
  },
];

export const toolByName = (name: string) => TOOLS.find((t) => t.name === name);

/** Ejecuta una herramienta comprobando el permiso del token. */
export async function runTool(name: string, args: Args, ctx: Ctx) {
  const tool = toolByName(name);
  if (!tool) throw new ApiError(404, `Herramienta desconocida: ${name}`);
  if (tool.write && ctx.principal.scope !== "edit") throw new ApiError(403, "Este token es de solo lectura");
  return tool.run(args, ctx);
}
