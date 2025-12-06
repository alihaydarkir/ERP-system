-- Enable pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Note: rag_knowledge table is created in 004_create_rag_knowledge.sql
-- This migration only ensures the pgvector extension is available