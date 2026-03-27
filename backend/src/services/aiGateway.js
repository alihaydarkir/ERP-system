const axios = require('axios');

class AIGateway {
  constructor() {
    this.provider = (process.env.AI_PROVIDER || process.env.OLLAMA_PROVIDER || 'ollama').toLowerCase();
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    this.azureOpenAIApiKey = process.env.AZURE_OPENAI_API_KEY || '';
    this.azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
    this.defaultModel = this.resolveDefaultModel();
    this.openaiEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.azureEmbeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || '';
    this.timeout = parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 180000;
    this.fallbackModel = process.env.AI_FALLBACK_MODEL || this.defaultModel;
  }

  resolveDefaultModel() {
    if (this.provider === 'openai') {
      return process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    if (this.provider === 'azure') {
      return process.env.AI_MODEL || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
    }

    return process.env.AI_MODEL || process.env.OLLAMA_MODEL || 'llama2';
  }

  getProvider() {
    return this.provider;
  }

  getDefaultModel() {
    return this.defaultModel;
  }

  trimTrailingSlash(url = '') {
    return String(url || '').replace(/\/+$/, '');
  }

  ensureProviderSupported() {
    if (!['ollama', 'openai', 'azure'].includes(this.provider)) {
      throw new Error(`Desteklenmeyen AI provider: ${this.provider}`);
    }
  }

  ensureProviderConfig() {
    this.ensureProviderSupported();

    if (this.provider === 'openai' && !this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY tanımlı değil');
    }

    if (this.provider === 'azure') {
      if (!this.azureOpenAIEndpoint) {
        throw new Error('AZURE_OPENAI_ENDPOINT tanımlı değil');
      }
      if (!this.azureOpenAIApiKey) {
        throw new Error('AZURE_OPENAI_API_KEY tanımlı değil');
      }
      if (!this.defaultModel) {
        throw new Error('AZURE_OPENAI_CHAT_DEPLOYMENT veya AZURE_OPENAI_DEPLOYMENT tanımlı değil');
      }
    }
  }

  sanitizeText(text = '') {
    return String(text)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/```/g, "'''")
      .replace(/ignore\s+previous\s+instructions/gi, '[filtered]')
      .trim();
  }

  maskPII(text = '') {
    return this.sanitizeText(text)
      .replace(/\b\d{11}\b/g, '[masked_tckn]')
      .replace(/\b\d{10}\b/g, '[masked_tax]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[masked_email]')
      .replace(/\+?\d[\d\s()-]{7,}\d/g, '[masked_phone]');
  }

  buildMessages(messages = []) {
    return messages.map((m) => ({
      role: m.role,
      content: this.maskPII(m.content || '')
    }));
  }

  normalizeOpenAIContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part;
          return part?.text || '';
        })
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    return '';
  }

  getAzureChatUrl(deployment) {
    const endpoint = this.trimTrailingSlash(this.azureOpenAIEndpoint);
    return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(this.azureApiVersion)}`;
  }

  getAzureEmbeddingsUrl(deployment) {
    const endpoint = this.trimTrailingSlash(this.azureOpenAIEndpoint);
    return `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${encodeURIComponent(this.azureApiVersion)}`;
  }

  getAzureDeploymentsUrl() {
    const endpoint = this.trimTrailingSlash(this.azureOpenAIEndpoint);
    return `${endpoint}/openai/deployments?api-version=${encodeURIComponent(this.azureApiVersion)}`;
  }

  async chat(messages, options = {}) {
    this.ensureProviderConfig();

    const selectedModel = options.model || this.defaultModel;
    const timeout = options.timeout || this.timeout;
    const builtMessages = this.buildMessages(messages);

    if (this.provider === 'ollama') {
      const response = await axios.post(
        `${this.ollamaUrl}/api/chat`,
        {
          model: selectedModel,
          messages: builtMessages,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.3,
            top_p: options.top_p ?? 0.9,
            max_tokens: options.max_tokens
          }
        },
        { timeout }
      );

      const content = response.data?.message?.content || '';
      if (!content && options.allowFallback !== false && this.fallbackModel && this.fallbackModel !== selectedModel) {
        return this.chat(messages, { ...options, model: this.fallbackModel, allowFallback: false });
      }

      return {
        provider: this.provider,
        model: selectedModel,
        content
      };
    }

    if (this.provider === 'openai') {
      const response = await axios.post(
        `${this.trimTrailingSlash(this.openaiBaseUrl)}/chat/completions`,
        {
          model: selectedModel,
          messages: builtMessages,
          temperature: options.temperature ?? 0.3,
          top_p: options.top_p ?? 0.9,
          max_tokens: options.max_tokens
        },
        {
          timeout,
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = this.normalizeOpenAIContent(response.data?.choices?.[0]?.message?.content);
      if (!content && options.allowFallback !== false && this.fallbackModel && this.fallbackModel !== selectedModel) {
        return this.chat(messages, { ...options, model: this.fallbackModel, allowFallback: false });
      }

      return {
        provider: this.provider,
        model: response.data?.model || selectedModel,
        content: content || ''
      };
    }

    const azureChatDeployment = options.model || this.defaultModel;
    const response = await axios.post(
      this.getAzureChatUrl(azureChatDeployment),
      {
        messages: builtMessages,
        temperature: options.temperature ?? 0.3,
        top_p: options.top_p ?? 0.9,
        max_tokens: options.max_tokens
      },
      {
        timeout,
        headers: {
          'api-key': this.azureOpenAIApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = this.normalizeOpenAIContent(response.data?.choices?.[0]?.message?.content);
    if (!content && options.allowFallback !== false && process.env.AZURE_OPENAI_FALLBACK_CHAT_DEPLOYMENT) {
      return this.chat(messages, {
        ...options,
        model: process.env.AZURE_OPENAI_FALLBACK_CHAT_DEPLOYMENT,
        allowFallback: false
      });
    }

    return {
      provider: this.provider,
      model: azureChatDeployment,
      content: content || ''
    };
  }

  async generate(prompt, options = {}) {
    this.ensureProviderConfig();

    if (this.provider === 'ollama') {
      const selectedModel = options.model || this.defaultModel;
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: selectedModel,
        prompt: this.maskPII(prompt),
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 0.9,
          max_tokens: options.max_tokens
        }
      }, {
        timeout: options.timeout || this.timeout
      });

      return {
        provider: this.provider,
        model: selectedModel,
        content: response.data?.response || '',
        context: response.data?.context
      };
    }

    const chatResponse = await this.chat([
      { role: 'user', content: this.maskPII(prompt) }
    ], {
      model: options.model,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.max_tokens,
      timeout: options.timeout || this.timeout
    });

    return {
      provider: chatResponse.provider,
      model: chatResponse.model,
      content: chatResponse.content,
      context: null
    };
  }

  async embeddings(text, options = {}) {
    this.ensureProviderConfig();

    if (this.provider === 'ollama') {
      const selectedModel = options.model || this.defaultModel;
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: selectedModel,
        prompt: this.maskPII(text)
      }, {
        timeout: options.timeout || this.timeout
      });

      return {
        provider: this.provider,
        model: selectedModel,
        embedding: response.data?.embedding || null
      };
    }

    if (this.provider === 'openai') {
      const embeddingModel = options.model || this.openaiEmbeddingModel;
      const response = await axios.post(
        `${this.trimTrailingSlash(this.openaiBaseUrl)}/embeddings`,
        {
          model: embeddingModel,
          input: this.maskPII(text)
        },
        {
          timeout: options.timeout || this.timeout,
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        provider: this.provider,
        model: embeddingModel,
        embedding: response.data?.data?.[0]?.embedding || null
      };
    }

    const embeddingDeployment = options.model || this.azureEmbeddingDeployment;
    if (!embeddingDeployment) {
      throw new Error('AZURE_OPENAI_EMBEDDING_DEPLOYMENT veya AZURE_OPENAI_DEPLOYMENT tanımlı değil');
    }

    const response = await axios.post(
      this.getAzureEmbeddingsUrl(embeddingDeployment),
      {
        input: this.maskPII(text)
      },
      {
        timeout: options.timeout || this.timeout,
        headers: {
          'api-key': this.azureOpenAIApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      provider: this.provider,
      model: embeddingDeployment,
      embedding: response.data?.data?.[0]?.embedding || null
    };
  }

  async health() {
    try {
      this.ensureProviderConfig();

      if (this.provider === 'ollama') {
        const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
        const models = (response.data?.models || []).map((m) => m.name);

        return {
          available: true,
          provider: this.provider,
          models,
          currentModel: this.defaultModel,
          modelAvailable: models.some((m) => m.startsWith(this.defaultModel.split(':')[0]))
        };
      }

      if (this.provider === 'openai') {
        const response = await axios.get(
          `${this.trimTrailingSlash(this.openaiBaseUrl)}/models`,
          {
            timeout: 5000,
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`
            }
          }
        );

        const models = (response.data?.data || []).map((m) => m.id);
        return {
          available: true,
          provider: this.provider,
          models,
          currentModel: this.defaultModel,
          modelAvailable: models.includes(this.defaultModel)
        };
      }

      const response = await axios.get(this.getAzureDeploymentsUrl(), {
        timeout: 5000,
        headers: {
          'api-key': this.azureOpenAIApiKey
        }
      });

      const deployments = (response.data?.data || []).map((d) => d.id || d.model || d.name).filter(Boolean);
      return {
        available: true,
        provider: this.provider,
        models: deployments,
        currentModel: this.defaultModel,
        modelAvailable: deployments.includes(this.defaultModel)
      };
    } catch (error) {
      return {
        available: false,
        provider: this.provider,
        error: error.message
      };
    }
  }
}

module.exports = new AIGateway();
