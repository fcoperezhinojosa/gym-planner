CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"duration_min" integer NOT NULL,
	"intensity" text DEFAULT 'moderate' NOT NULL,
	"kcal" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "calendar_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"routine_id" integer,
	"activity_type" text,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_es" text,
	"primary_muscle" text NOT NULL,
	"secondary_muscles" text[] DEFAULT '{}' NOT NULL,
	"equipment" text DEFAULT 'other' NOT NULL,
	"category" text DEFAULT 'strength' NOT NULL,
	"level" text,
	"mechanic" text,
	"force" text,
	"instructions" text[] DEFAULT '{}' NOT NULL,
	"images" text[] DEFAULT '{}' NOT NULL,
	"owner_id" integer
);
--> statement-breakpoint
CREATE TABLE "plan_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"week_index" integer NOT NULL,
	"weekday" integer NOT NULL,
	"kind" text NOT NULL,
	"routine_id" integer,
	"activity_type" text,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"cycle_weeks" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"rest_seconds" integer DEFAULT 90 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "routine_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_exercise_id" integer NOT NULL,
	"position" integer NOT NULL,
	"reps" integer DEFAULT 10 NOT NULL,
	"weight_kg" real DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'normal' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#f97316' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"rest_seconds" integer DEFAULT 90 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_exercise_id" integer NOT NULL,
	"position" integer NOT NULL,
	"reps" integer DEFAULT 10 NOT NULL,
	"weight_kg" real DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'normal' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"body_weight_kg" real DEFAULT 75 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"routine_id" integer,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_min" integer,
	"intensity" text DEFAULT 'moderate' NOT NULL,
	"kcal" integer,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD CONSTRAINT "calendar_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD CONSTRAINT "calendar_overrides_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_sets" ADD CONSTRAINT "routine_sets_routine_exercise_id_routine_exercises_id_fk" FOREIGN KEY ("routine_exercise_id") REFERENCES "public"."routine_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_exercise_id_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_date_idx" ON "activities" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_overrides_user_date_idx" ON "calendar_overrides" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "exercises_muscle_idx" ON "exercises" USING btree ("primary_muscle");--> statement-breakpoint
CREATE INDEX "exercises_equipment_idx" ON "exercises" USING btree ("equipment");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_days_cell_idx" ON "plan_days" USING btree ("plan_id","week_index","weekday");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_date_idx" ON "workout_sessions" USING btree ("user_id","date");