-- Enable PostgreSQL extensions required for AI/staffing features.
-- This migration was applied manually to production; stub added to clear Prisma drift.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
