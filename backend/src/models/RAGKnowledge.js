const pool = require('../config/database');

class RAGKnowledge {
  /**
   * Create a new knowledge entry with vector embedding
   */
  static async create({ content, metadata = {}, embedding }) {
    const query = `
      INSERT INTO rag_knowledge (content, metadata, embedding)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [content, JSON.stringify(metadata), embedding];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find knowledge by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM rag_knowledge WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get all knowledge entries
   */
  static async findAll(limit = 100, offset = 0) {
    const query = `
      SELECT * FROM rag_knowledge
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Search by vector similarity (cosine similarity)
   */
  static async searchBySimilarity(embedding, limit = 5, threshold = 0.7) {
    const query = `
      SELECT
        *,
        1 - (embedding <=> $1::vector) as similarity
      FROM rag_knowledge
      WHERE 1 - (embedding <=> $1::vector) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;

    const result = await pool.query(query, [JSON.stringify(embedding), threshold, limit]);
    return result.rows;
  }

  /**
   * Search by content (full-text search)
   */
  static async searchByContent(searchText, limit = 10) {
    const query = `
      SELECT * FROM rag_knowledge
      WHERE content ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [`%${searchText}%`, limit]);
    return result.rows;
  }

  /**
   * Update knowledge entry
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.content !== undefined) {
      fields.push(`content = $${paramCount}`);
      values.push(data.content);
      paramCount++;
    }

    if (data.metadata !== undefined) {
      fields.push(`metadata = $${paramCount}`);
      values.push(JSON.stringify(data.metadata));
      paramCount++;
    }

    if (data.embedding !== undefined) {
      fields.push(`embedding = $${paramCount}`);
      values.push(data.embedding);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE rag_knowledge
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete knowledge entry
   */
  static async delete(id) {
    const query = 'DELETE FROM rag_knowledge WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Bulk insert knowledge entries
   */
  static async bulkCreate(entries) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const results = [];

      for (const entry of entries) {
        const query = `
          INSERT INTO rag_knowledge (content, metadata, embedding)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        const values = [
          entry.content,
          JSON.stringify(entry.metadata || {}),
          entry.embedding
        ];
        const result = await client.query(query, values);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get knowledge by metadata filter
   */
  static async findByMetadata(metadataFilter) {
    const query = `
      SELECT * FROM rag_knowledge
      WHERE metadata @> $1::jsonb
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [JSON.stringify(metadataFilter)]);
    return result.rows;
  }

  /**
   * Count total knowledge entries
   */
  static async count() {
    const query = 'SELECT COUNT(*) FROM rag_knowledge';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete all knowledge entries (use with caution)
   */
  static async truncate() {
    const query = 'TRUNCATE TABLE rag_knowledge RESTART IDENTITY CASCADE';
    await pool.query(query);
    return { success: true };
  }
}

module.exports = RAGKnowledge;
