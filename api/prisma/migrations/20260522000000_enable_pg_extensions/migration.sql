-- Enable PostgreSQL extensions required by the platform.
-- Must run before any migration that uses vector, cube, or earthdistance types.
-- Render Postgres ≥ v14 ships all three; superuser role is not required on Render.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
