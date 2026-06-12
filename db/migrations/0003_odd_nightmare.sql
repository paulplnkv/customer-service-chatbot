CREATE TABLE "aircraft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"registration" varchar(12) NOT NULL,
	"serial_number" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"hull_value" numeric(12, 2),
	"seats" integer,
	"primary_use" varchar(100)
);
--> statement-breakpoint
DROP TABLE "vehicles" CASCADE;--> statement-breakpoint
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;