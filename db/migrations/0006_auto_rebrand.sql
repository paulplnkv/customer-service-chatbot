ALTER TABLE "aircraft" RENAME TO "vehicles";--> statement-breakpoint
ALTER TABLE "vehicles" RENAME COLUMN "registration" TO "plate";--> statement-breakpoint
ALTER TABLE "vehicles" RENAME COLUMN "serial_number" TO "vin";--> statement-breakpoint
ALTER TABLE "vehicles" RENAME COLUMN "hull_value" TO "value";--> statement-breakpoint
ALTER TABLE "vehicles" RENAME COLUMN "primary_use" TO "use";--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "plate" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "vin" SET DATA TYPE varchar(17);--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "payment_date" date;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "payment_status" varchar(20);--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "agent_name" varchar(255);--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "agent_response" text;
