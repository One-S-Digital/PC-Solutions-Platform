-- CreateTable: seed_records for tracking completed seeds
CREATE TABLE IF NOT EXISTS "seed_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seed_name" VARCHAR(255) NOT NULL,
    "version" VARCHAR(50),
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_by" VARCHAR(255),
    "metadata" JSONB,

    CONSTRAINT "seed_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "seed_records_seed_name_key" ON "seed_records"("seed_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "seed_records_seed_name_idx" ON "seed_records"("seed_name");
