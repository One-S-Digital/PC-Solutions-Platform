-- Add educator-controlled visibility flag for candidate pool
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "candidatePoolVisible" BOOLEAN NOT NULL DEFAULT TRUE;

