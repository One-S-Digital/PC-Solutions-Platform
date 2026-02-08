-- Create structured educator profile item tables

-- Work experience entries
CREATE TABLE IF NOT EXISTS "educator_work_experiences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "institutionName" TEXT NOT NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  "descriptionPoints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "educator_work_experiences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "educator_work_experiences_userId_idx"
  ON "educator_work_experiences"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'educator_work_experiences_userId_fkey'
  ) THEN
    ALTER TABLE "educator_work_experiences"
      ADD CONSTRAINT "educator_work_experiences_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Education entries
CREATE TABLE IF NOT EXISTS "educator_educations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "degree" TEXT NOT NULL,
  "institutionName" TEXT NOT NULL,
  "graduationYear" TEXT,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "educator_educations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "educator_educations_userId_idx"
  ON "educator_educations"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'educator_educations_userId_fkey'
  ) THEN
    ALTER TABLE "educator_educations"
      ADD CONSTRAINT "educator_educations_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Certification entries
CREATE TABLE IF NOT EXISTS "educator_certifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "issuingOrganization" TEXT,
  "issueDate" TEXT,
  "expiryDate" TEXT,
  "credentialUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "educator_certifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "educator_certifications_userId_idx"
  ON "educator_certifications"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'educator_certifications_userId_fkey'
  ) THEN
    ALTER TABLE "educator_certifications"
      ADD CONSTRAINT "educator_certifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
