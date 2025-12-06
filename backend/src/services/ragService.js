const RAGKnowledge = require('../models/RAGKnowledge');
const aiService = require('./aiService');

class RAGService {
  constructor() {
    this.topK = parseInt(process.env.RAG_TOP_K) || 5;
    this.threshold = parseFloat(process.env.RAG_THRESHOLD) || 0.7;
  }

  /**
   * Add knowledge to RAG database
   */
  async addKnowledge(content, metadata = {}) {
    try {
      // Generate embeddings for the content
      const embeddingResult = await aiService.generateEmbeddings(content);

      if (!embeddingResult.success) {
        throw new Error('Failed to generate embeddings');
      }

      // Store in database
      const knowledge = await RAGKnowledge.create({
        content,
        metadata,
        embedding: embeddingResult.embeddings
      });

      return {
        success: true,
        knowledge
      };
    } catch (error) {
      console.error('RAG add knowledge error:', error.message);
      return {
        success: false,
        error: error.message
      };
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
          processedEntries.push({
            content: entry.content,
            metadata: entry.metadata || {},
            embedding: embeddingResult.embeddings
          });
        }
      }

      const results = await RAGKnowledge.bulkCreate(processedEntries);

      return {
        success: true,
        count: results.length,
        results
      };
    } catch (error) {
      console.error('RAG bulk add error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search knowledge base using vector similarity
   */
  async search(query, options = {}) {
    try {
      // Generate embeddings for the query
      const embeddingResult = await aiService.generateEmbeddings(query);

      if (!embeddingResult.success) {
        throw new Error('Failed to generate query embeddings');
      }

      const limit = options.limit || this.topK;
      const threshold = options.threshold || this.threshold;

      // Search using vector similarity
      const results = await RAGKnowledge.searchBySimilarity(
        embeddingResult.embeddings,
        limit,
        threshold
      );

      return {
        success: true,
        results,
        count: results.length
      };
    } catch (error) {
      console.error('RAG search error:', error.message);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Generate answer using RAG
   */
  async generateAnswer(question, options = {}) {
    try {
      // Search for relevant knowledge
      const searchResult = await this.search(question, options);

      if (!searchResult.success || searchResult.results.length === 0) {
        // No relevant context found, use AI without RAG
        return await aiService.generateERPResponse(question);
      }

      // Build context from search results
      const context = searchResult.results
        .map((result, index) => `${index + 1}. ${result.content} (similarity: ${result.similarity.toFixed(2)})`)
        .join('\n\n');

      // Generate answer with context
      const prompt = `Based on the following information, answer the user's question.

Relevant Information:
${context}

User Question: ${question}

Answer (be concise and accurate):`;

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
        answer: 'Sorry, I could not generate an answer at this time.'
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

      const updated = await RAGKnowledge.update(id, {
        content,
        metadata,
        embedding: embeddingResult.embeddings
      });

      return {
        success: true,
        knowledge: updated
      };
    } catch (error) {
      console.error('RAG update error:', error.message);
      return {
        success: false,
        error: error.message
      };
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
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all knowledge entries
   */
  async getAllKnowledge(limit = 100, offset = 0) {
    try {
      const results = await RAGKnowledge.findAll(limit, offset);
      const count = await RAGKnowledge.count();

      return {
        success: true,
        results,
        count,
        limit,
        offset
      };
    } catch (error) {
      console.error('RAG get all error:', error.message);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Search by content (text search)
   */
  async searchByText(searchText, limit = 10) {
    try {
      const results = await RAGKnowledge.searchByContent(searchText, limit);

      return {
        success: true,
        results,
        count: results.length
      };
    } catch (error) {
      console.error('RAG text search error:', error.message);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Initialize knowledge base with default ERP knowledge
   */
  async initializeDefaultKnowledge() {
    const defaultKnowledge = [
      {
        content: 'To check product stock, navigate to Products page and view the stock column. Low stock items are highlighted in red.',
        metadata: { category: 'products', topic: 'stock_management' }
      },
      {
        content: 'Orders can be created from the Orders page. Select products, enter quantities, and the system will automatically calculate totals.',
        metadata: { category: 'orders', topic: 'order_creation' }
      },
      {
        content: 'To generate reports, go to Reports page and select the time period. You can export reports as PDF or Excel.',
        metadata: { category: 'reports', topic: 'report_generation' }
      },
      {
        content: 'User roles include: Admin (full access), Manager (view and create), User (view only). Contact admin to change roles.',
        metadata: { category: 'users', topic: 'roles_permissions' }
      },
      {
        content: 'Dashboard shows real-time KPIs including total revenue, orders count, low stock alerts, and recent activities.',
        metadata: { category: 'dashboard', topic: 'kpis' }
      }
    ];

    return await this.bulkAddKnowledge(defaultKnowledge);
  }
}

module.exports = new RAGService();
