import {
  boolean,
  date,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  bodyWeightKg: real("body_weight_kg").notNull().default(75),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Catálogo de ejercicios. Semilla: free-exercise-db (dominio público). */
export const exercises = pgTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nameEs: text("name_es"),
    primaryMuscle: text("primary_muscle").notNull(),
    secondaryMuscles: text("secondary_muscles").array().notNull().default([]),
    equipment: text("equipment").notNull().default("other"),
    category: text("category").notNull().default("strength"),
    level: text("level"),
    mechanic: text("mechanic"),
    force: text("force"),
    instructions: text("instructions").array().notNull().default([]),
    images: text("images").array().notNull().default([]),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [index("exercises_muscle_idx").on(t.primaryMuscle), index("exercises_equipment_idx").on(t.equipment)],
);

/* ───────────── Plantillas ───────────── */

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#f97316"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routineExercises = pgTable("routine_exercises", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull().references(() => exercises.id),
  position: integer("position").notNull(),
  restSeconds: integer("rest_seconds").notNull().default(90),
  notes: text("notes"),
});

export const routineSets = pgTable("routine_sets", {
  id: serial("id").primaryKey(),
  routineExerciseId: integer("routine_exercise_id")
    .notNull()
    .references(() => routineExercises.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  reps: integer("reps").notNull().default(10),
  weightKg: real("weight_kg").notNull().default(0),
  type: text("type").notNull().default("normal"),
});

/* ───────────── Plan semanal con rotación ───────────── */

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  cycleWeeks: integer("cycle_weeks").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
});

/** kind: workout | rest | activity */
export const planDays = pgTable(
  "plan_days",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
    weekIndex: integer("week_index").notNull(),
    weekday: integer("weekday").notNull(),
    kind: text("kind").notNull(),
    routineId: integer("routine_id").references(() => routines.id, { onDelete: "set null" }),
    activityType: text("activity_type"),
    label: text("label"),
  },
  (t) => [uniqueIndex("plan_days_cell_idx").on(t.planId, t.weekIndex, t.weekday)],
);

export const calendarOverrides = pgTable(
  "calendar_overrides",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    kind: text("kind").notNull(),
    routineId: integer("routine_id").references(() => routines.id, { onDelete: "set null" }),
    activityType: text("activity_type"),
    label: text("label"),
  },
  (t) => [uniqueIndex("calendar_overrides_user_date_idx").on(t.userId, t.date)],
);

/* ───────────── Lo hecho ───────────── */

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    routineId: integer("routine_id").references(() => routines.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    date: date("date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMin: integer("duration_min"),
    intensity: text("intensity").notNull().default("moderate"),
    kcal: integer("kcal"),
    notes: text("notes"),
  },
  (t) => [index("workout_sessions_user_date_idx").on(t.userId, t.date)],
);

export const sessionExercises = pgTable("session_exercises", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull().references(() => exercises.id),
  position: integer("position").notNull(),
  restSeconds: integer("rest_seconds").notNull().default(90),
});

export const sessionSets = pgTable("session_sets", {
  id: serial("id").primaryKey(),
  sessionExerciseId: integer("session_exercise_id")
    .notNull()
    .references(() => sessionExercises.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  reps: integer("reps").notNull().default(10),
  weightKg: real("weight_kg").notNull().default(0),
  type: text("type").notNull().default("normal"),
  completed: boolean("completed").notNull().default(false),
});

/** Actividades fuera del gimnasio: pádel, correr, bici… */
export const activities = pgTable(
  "activities",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: text("type").notNull(),
    durationMin: integer("duration_min").notNull(),
    intensity: text("intensity").notNull().default("moderate"),
    kcal: integer("kcal").notNull(),
    notes: text("notes"),
  },
  (t) => [index("activities_user_date_idx").on(t.userId, t.date)],
);

/* ───────────── Acceso para IAs / integraciones ───────────── */

/** Tokens personales de API. Solo se guarda el hash SHA-256. scope: read | edit */
export const apiTokens = pgTable(
  "api_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    scope: text("scope").notNull().default("edit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [index("api_tokens_user_idx").on(t.userId)],
);
