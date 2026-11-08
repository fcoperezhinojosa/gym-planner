CREATE TABLE "intake_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"kcal" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sex" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "height_cm" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_intake_kcal" integer;--> statement-breakpoint
ALTER TABLE "intake_logs" ADD CONSTRAINT "intake_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intake_logs_user_date_idx" ON "intake_logs" USING btree ("user_id","date");