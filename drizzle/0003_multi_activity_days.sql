ALTER TABLE "calendar_overrides" ADD COLUMN "extra_activities" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_days" ADD COLUMN "extra_activities" text[] DEFAULT '{}' NOT NULL;