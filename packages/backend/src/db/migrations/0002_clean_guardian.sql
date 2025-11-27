ALTER TABLE "sessions" ADD COLUMN "provider" text DEFAULT 'anthropic' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "model" text DEFAULT 'claude-3-5-haiku-latest' NOT NULL;