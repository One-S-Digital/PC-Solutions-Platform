-- Knowledge article embeddings for semantic search.
-- Requires pgvector extension (already enabled via 20260522000000_enable_pg_extensions).

CREATE TABLE IF NOT EXISTS "knowledge_article_embeddings" (
  "id"          TEXT          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "articleId"   TEXT          NOT NULL,
  "contentHash" TEXT          NOT NULL,
  "embedding"   vector(512),
  "updatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_article_embeddings_articleId_key"
  ON "knowledge_article_embeddings"("articleId");

CREATE INDEX IF NOT EXISTS "knowledge_article_embeddings_embedding_idx"
  ON "knowledge_article_embeddings" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 10);
