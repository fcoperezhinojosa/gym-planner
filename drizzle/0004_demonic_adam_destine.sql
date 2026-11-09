ALTER TABLE "routine_exercises" ALTER COLUMN "rest_seconds" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "session_exercises" ALTER COLUMN "rest_seconds" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_rest_seconds" integer DEFAULT 60 NOT NULL;