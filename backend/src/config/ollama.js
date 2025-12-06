const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const ollamaConfig = {
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama2',
  timeout: 120000, // 2 minutes for longer responses
};

const ollamaClient = axios.create({
  baseURL: ollamaConfig.baseURL,
  timeout: ollamaConfig.timeout,
});

// Test connection
const testOllama = async () => {
  try {
    const response = await ollamaClient.get('/api/tags');
    console.log('✅ Ollama connected');
    return true;
  } catch (error) {
    console.error('❌ Ollama error:', error.message);
    return false;
  }
};

module.exports = {
  ollamaClient,
  ollamaConfig,
  testOllama,
};

