const fineTuningService = require('../services/fineTuningService');
const { formatSuccess, formatError } = require('../utils/formatters');
const AuditLog = require('../models/AuditLog');
const { getClientIP } = require('../utils/helpers');

/**
 * Initialize fine-tuning service
 */
const initialize = async (req, res) => {
  try {
    const result = await fineTuningService.initialize();

    if (!result.success) {
      return res.status(500).json(formatError(result.error));
    }

    res.json(formatSuccess(result, 'Fine-tuning service initialized'));

  } catch (error) {
    console.error('Initialize error:', error);
    res.status(500).json(formatError('Failed to initialize fine-tuning service'));
  }
};

/**
 * Generate Turkish ERP training dataset
 */
const generateDataset = async (req, res) => {
  try {
    const result = await fineTuningService.generateTurkishERPDataset();

    if (!result.success) {
      return res.status(500).json(formatError(result.error));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'GENERATE_DATASET',
      entity_type: 'fine_tuning',
      entity_id: null,
      changes: {
        filename: result.filename,
        count: result.count
      },
      ip_address: getClientIP(req)
    });

    res.json(formatSuccess({
      filename: result.filename,
      count: result.count,
      filepath: result.filepath
    }, 'Turkish ERP dataset generated successfully'));

  } catch (error) {
    console.error('Generate dataset error:', error);
    res.status(500).json(formatError('Failed to generate dataset'));
  }
};

/**
 * Create fine-tuned model
 */
const createModel = async (req, res) => {
  try {
    const { modelName, datasetFilename } = req.body;

    if (!modelName || !datasetFilename) {
      return res.status(400).json(formatError('Model name and dataset filename required'));
    }

    const path = require('path');
    const datasetPath = path.join(
      fineTuningService.datasetsDir,
      datasetFilename
    );

    console.log(`Creating fine-tuned model: ${modelName}`);

    // This is a long-running operation, consider using background job
    const result = await fineTuningService.createFineTunedModel(modelName, datasetPath);

    if (!result.success) {
      return res.status(500).json(formatError(result.error || result.message));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'CREATE_MODEL',
      entity_type: 'fine_tuning',
      entity_id: null,
      changes: {
        modelName,
        datasetFilename
      },
      ip_address: getClientIP(req)
    });

    res.json(formatSuccess({
      modelName: result.modelName,
      logPath: result.logPath
    }, `Model ${modelName} created successfully`));

  } catch (error) {
    console.error('Create model error:', error);
    res.status(500).json(formatError('Failed to create model'));
  }
};

/**
 * List all models
 */
const listModels = async (req, res) => {
  try {
    const result = await fineTuningService.listModels();

    if (!result.success) {
      return res.status(500).json(formatError(result.error));
    }

    res.json(formatSuccess({
      models: result.models,
      count: result.count
    }));

  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json(formatError('Failed to list models'));
  }
};

/**
 * Test a model
 */
const testModel = async (req, res) => {
  try {
    const { modelName, prompt } = req.body;

    if (!modelName || !prompt) {
      return res.status(400).json(formatError('Model name and prompt required'));
    }

    const result = await fineTuningService.testModel(modelName, prompt);

    if (!result.success) {
      return res.status(500).json(formatError(result.error));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'TEST_MODEL',
      entity_type: 'fine_tuning',
      entity_id: null,
      changes: {
        modelName,
        prompt: prompt.substring(0, 100)
      },
      ip_address: getClientIP(req)
    });

    res.json(formatSuccess({
      model: result.model,
      prompt: result.prompt,
      response: result.response
    }));

  } catch (error) {
    console.error('Test model error:', error);
    res.status(500).json(formatError('Failed to test model'));
  }
};

/**
 * Delete a model
 */
const deleteModel = async (req, res) => {
  try {
    const { modelName } = req.params;

    if (!modelName) {
      return res.status(400).json(formatError('Model name required'));
    }

    const result = await fineTuningService.deleteModel(modelName);

    if (!result.success) {
      return res.status(500).json(formatError(result.error));
    }

    // Log activity
    await AuditLog.create({
      user_id: req.user.userId,
      action: 'DELETE_MODEL',
      entity_type: 'fine_tuning',
      entity_id: null,
      changes: {
        modelName
      },
      ip_address: getClientIP(req)
    });

    res.json(formatSuccess(null, result.message));

  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json(formatError('Failed to delete model'));
  }
};

/**
 * Get fine-tuning statistics
 */
const getStatistics = async (req, res) => {
  try {
    const result = await fineTuningService.getStatistics();

    if (!result.success) {
      return res.status(500).json(formatError(result.error));
    }

    res.json(formatSuccess(result.statistics));

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json(formatError('Failed to get statistics'));
  }
};

/**
 * Get available datasets
 */
const listDatasets = async (req, res) => {
  try {
    const fs = require('fs').promises;
    const datasets = await fs.readdir(fineTuningService.datasetsDir);

    const datasetList = await Promise.all(
      datasets
        .filter(f => f.endsWith('.json'))
        .map(async (filename) => {
          const filepath = require('path').join(fineTuningService.datasetsDir, filename);
          const stats = await fs.stat(filepath);
          const content = await fs.readFile(filepath, 'utf8');
          const data = JSON.parse(content);

          return {
            filename,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            examples_count: data.examples?.length || 0,
            version: data.version,
            language: data.language
          };
        })
    );

    res.json(formatSuccess({
      datasets: datasetList,
      count: datasetList.length
    }));

  } catch (error) {
    console.error('List datasets error:', error);
    res.status(500).json(formatError('Failed to list datasets'));
  }
};

module.exports = {
  initialize,
  generateDataset,
  createModel,
  listModels,
  testModel,
  deleteModel,
  getStatistics,
  listDatasets
};
