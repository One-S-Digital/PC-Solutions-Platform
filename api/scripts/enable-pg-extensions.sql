-- Run this script once on each environment as a superuser BEFORE running Prisma migrations.
-- Required for the staffing Phase 1 migration (20260521000000_add_staffing_phase1).
--
-- On Supabase: Dashboard → SQL Editor, paste and run.
-- On RDS: use a superuser connection or request the extension from your DBA.
-- On local Postgres: psql -U postgres -d <db> -f this_file.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
