-- Add vector embedding column to rag_knowledge for semantic search
-- nomic-embed-text produces 768-dimensional vectors

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE rag_knowledge
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS source VARCHAR(255);

-- Index for fast vector similarity search
-- Some pgvector/PostgreSQL combinations can fail when table has no vectors yet.
DO $$
DECLARE
  vector_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO vector_count
  FROM rag_knowledge
  WHERE embedding IS NOT NULL;

  IF vector_count > 0 THEN
    IF to_regclass('public.idx_rag_knowledge_embedding') IS NULL THEN
      EXECUTE 'CREATE INDEX idx_rag_knowledge_embedding
               ON rag_knowledge USING ivfflat (embedding vector_cosine_ops)
               WITH (lists = 10)';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping idx_rag_knowledge_embedding creation because rag_knowledge has no embedding rows yet.';
  END IF;
END $$;
