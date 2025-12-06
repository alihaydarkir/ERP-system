const axios = require('axios');

class AIService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama2';
    this.maxTokens = parseInt(process.env.AI_MAX_CONTEXT) || 2000;
  }

  /**
   * Generate text completion using Ollama
   */
  async generateCompletion(prompt, options = {}) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || this.maxTokens
        }
      });

      return {
        success: true,
        response: response.data.response,
        model: this.model,
        context: response.data.context
      };
    } catch (error) {
      console.error('Ollama completion error:', error.message);
      return {
        success: false,
        error: error.message,
        response: 'Sorry, I am unable to process your request at the moment.'
      };
    }
  }

  /**
   * Generate chat response
   */
  async chat(messages, options = {}) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9
        }
      });

      return {
        success: true,
        message: response.data.message,
        model: this.model
      };
    } catch (error) {
      console.error('Ollama chat error:', error.message);
      return {
        success: false,
        error: error.message,
        message: { role: 'assistant', content: 'Sorry, I am unable to respond at the moment.' }
      };
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(text) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.model,
        prompt: text
      });

      return {
        success: true,
        embeddings: response.data.embedding
      };
    } catch (error) {
      console.error('Ollama embeddings error:', error.message);
      return {
        success: false,
        error: error.message,
        embeddings: null
      };
    }
  }

  /**
   * Check if Ollama is available
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000
      });
      return {
        available: true,
        models: response.data.models || []
      };
    } catch (error) {
      console.error('Ollama health check failed:', error.message);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Generate ERP-specific response with context
   */
  async generateERPResponse(userQuery, context = '') {
    const systemPrompt = `You are an AI assistant for an ERP (Enterprise Resource Planning) system.
You help users with:
- Product management and inventory queries
- Order processing and status
- Sales reports and analytics
- General business operations

Provide clear, concise, and helpful responses. If you need more information, ask the user.

Context: ${context}

User Query: ${userQuery}

Response:`;

    return await this.generateCompletion(systemPrompt);
  }

  /**
   * Analyze product data
   */
  async analyzeProducts(products) {
    const prompt = `Analyze the following product data and provide insights:

Products: ${JSON.stringify(products, null, 2)}

Provide:
1. Low stock alerts
2. Popular categories
3. Pricing recommendations
4. Inventory insights

Analysis:`;

    return await this.generateCompletion(prompt);
  }

  /**
   * Generate order summary
   */
  async summarizeOrders(orders) {
    const prompt = `Summarize the following orders:

Orders: ${JSON.stringify(orders, null, 2)}

Provide:
1. Total revenue
2. Top selling products
3. Order trends
4. Customer insights

Summary:`;

    return await this.generateCompletion(prompt);
  }

  /**
   * Generate business insights
   */
  async generateInsights(data) {
    const prompt = `Analyze the following business data and provide actionable insights:

Data: ${JSON.stringify(data, null, 2)}

Provide:
1. Key performance indicators
2. Trends and patterns
3. Recommendations
4. Potential issues

Insights:`;

    return await this.generateCompletion(prompt);
  }
}

module.exports = new AIService();
