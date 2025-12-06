-- Create RAG knowledge base table (without vector embeddings yet)
CREATE TABLE IF NOT EXISTS rag_knowledge (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_rag_knowledge_category ON rag_knowledge(category);
CREATE INDEX idx_rag_knowledge_title ON rag_knowledge USING gin(to_tsvector('english', title));
CREATE INDEX idx_rag_knowledge_content ON rag_knowledge USING gin(to_tsvector('english', content));

