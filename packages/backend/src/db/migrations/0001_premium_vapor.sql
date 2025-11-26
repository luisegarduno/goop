-- Add working_directory column with default value for existing rows
ALTER TABLE "sessions" ADD COLUMN "working_directory" text NOT NULL DEFAULT '.';

-- Remove the default for future inserts (they must specify working_directory)
ALTER TABLE "sessions" ALTER COLUMN "working_directory" DROP DEFAULT;