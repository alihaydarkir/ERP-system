const RAGKnowledge = require('../models/RAGKnowledge');
const aiService = require('./aiService');

class RAGService {
  constructor() {
    this.topK = parseInt(process.env.RAG_TOP_K) || 5;
    this.threshold = parseFloat(process.env.RAG_THRESHOLD) || 0.7;
    this.embeddingDimensions = parseInt(process.env.RAG_EMBEDDING_DIM, 10) || 768;
  }

  ensureValidEmbedding(embedding, context = 'embedding') {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(`${context} geçersiz: embedding dizisi bekleniyor`);
    }

    if (embedding.length !== this.embeddingDimensions) {
      throw new Error(
        `${context} boyutu uyuşmuyor: beklenen ${this.embeddingDimensions}, gelen ${embedding.length}`
      );
    }

    if (embedding.some((value) => !Number.isFinite(Number(value)))) {
      throw new Error(`${context} geçersiz: embedding sayısal olmayan değer içeriyor`);
    }
  }

  /**
   * Add knowledge to RAG database
   */
  async addKnowledge(content, metadata = {}) {
    try {
      const embeddingResult = await aiService.generateEmbeddings(content);

      if (!embeddingResult.success) {
        throw new Error('Failed to generate embeddings');
      }

      this.ensureValidEmbedding(embeddingResult.embeddings, 'Bilgi embedding');

      const knowledge = await RAGKnowledge.create({
        content,
        metadata,
        embedding: embeddingResult.embeddings
      });

      return { success: true, knowledge };
    } catch (error) {
      console.error('RAG add knowledge error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk add knowledge entries
   */
  async bulkAddKnowledge(entries) {
    try {
      const processedEntries = [];

      for (const entry of entries) {
        const embeddingResult = await aiService.generateEmbeddings(entry.content);

        if (embeddingResult.success) {
          this.ensureValidEmbedding(embeddingResult.embeddings, 'Toplu bilgi embedding');
          processedEntries.push({
            content: entry.content,
            metadata: entry.metadata || {},
            embedding: embeddingResult.embeddings
          });
        }
      }

      const results = await RAGKnowledge.bulkCreate(processedEntries);

      return { success: true, count: results.length, results };
    } catch (error) {
      console.error('RAG bulk add error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search knowledge base using vector similarity
   */
  async search(query, options = {}) {
    try {
      const embeddingResult = await aiService.generateEmbeddings(query);

      if (!embeddingResult.success) {
        throw new Error('Failed to generate query embeddings');
      }

      this.ensureValidEmbedding(embeddingResult.embeddings, 'Sorgu embedding');

      const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : this.topK;
      const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : this.threshold;

      const results = await RAGKnowledge.searchBySimilarity(
        embeddingResult.embeddings,
        limit,
        threshold
      );

      return { success: true, results, count: results.length };
    } catch (error) {
      console.error('RAG search error:', error.message);
      return { success: false, error: error.message, results: [] };
    }
  }

  /**
   * Generate answer using RAG
   */
  async generateAnswer(question, options = {}) {
    try {
      const searchResult = await this.search(question, options);

      if (!searchResult.success || searchResult.results.length === 0) {
        return await aiService.generateERPResponse(question);
      }

      const context = searchResult.results
        .map((result, index) => `${index + 1}. ${result.content} (similarity: ${result.similarity.toFixed(2)})`)
        .join('\n\n');

      const prompt = `Aşağıdaki bilgilere dayanarak kullanıcının sorusunu yanıtla.

İlgili Bilgiler:
${context}

Kullanıcı Sorusu: ${question}

Yanıt (kısa ve doğru ol):`;

      const aiResponse = await aiService.generateCompletion(prompt);

      return {
        success: true,
        answer: aiResponse.response,
        sources: searchResult.results.map(r => ({
          content: r.content,
          similarity: r.similarity,
          metadata: r.metadata
        })),
        context_used: searchResult.results.length > 0
      };
    } catch (error) {
      console.error('RAG generate answer error:', error.message);
      return {
        success: false,
        error: error.message,
        answer: 'Şu anda yanıt üretilemedi.'
      };
    }
  }

  /**
   * Update knowledge base with new information
   */
  async updateKnowledge(id, content, metadata = {}) {
    try {
      const embeddingResult = await aiService.generateEmbeddings(content);

      if (!embeddingResult.success) {
        throw new Error('Failed to generate embeddings');
      }

      this.ensureValidEmbedding(embeddingResult.embeddings, 'Güncelleme embedding');

      const updated = await RAGKnowledge.update(id, {
        content,
        metadata,
        embedding: embeddingResult.embeddings
      });

      return { success: true, knowledge: updated };
    } catch (error) {
      console.error('RAG update error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete knowledge entry
   */
  async deleteKnowledge(id) {
    try {
      await RAGKnowledge.delete(id);
      return { success: true };
    } catch (error) {
      console.error('RAG delete error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all knowledge entries
   */
  async getAllKnowledge(limit = 100, offset = 0) {
    try {
      const results = await RAGKnowledge.findAll(limit, offset);
      const count = await RAGKnowledge.count();

      return { success: true, results, count, limit, offset };
    } catch (error) {
      console.error('RAG get all error:', error.message);
      return { success: false, error: error.message, results: [] };
    }
  }

  /**
   * Search by content (text search)
   */
  async searchByText(searchText, limit = 10) {
    try {
      const results = await RAGKnowledge.searchByContent(searchText, limit);
      return { success: true, results, count: results.length };
    } catch (error) {
      console.error('RAG text search error:', error.message);
      return { success: false, error: error.message, results: [] };
    }
  }
}

module.exports = new RAGService();
