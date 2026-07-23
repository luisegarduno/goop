ALTER TABLE "sessions" ALTER COLUMN "model" SET DEFAULT 'claude-opus-4-8';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "agent_session_id" text;