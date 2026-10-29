const ExcelService = require('../services/excelService');
const BulkImportService = require('../services/bulkImportService');
const ActivityLogService = require('../services/activityLogService');

/**
 * Import Controller - Handles Excel import endpoints
 */

/**
 * Validate Excel file and preview data
 * POST /api/import/validate
 */
const validateImport = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Dosya yüklenmedi',
      });
    }

    // Parse Excel file
    const parseResult = await ExcelService.parseExcelFile(req.file.buffer);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.errors.join(', '),
      });
    }

    // Validate data
    const validationResult = await BulkImportService.validateImportData(parseResult.data, req.user.company_id);

    return res.status(200).json({
      success: true,
      preview: validationResult.preview,
      stats: validationResult.stats,
    });
  } catch (error) {
    console.error('Import validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Dosya doğrulanırken bir hata oluştu',
    });
  }
};

/**
 * Process valid import data
 * POST /api/import/process
 */
const processImport = async (req, res) => {
  try {
    const { validData } = req.body;

    if (!validData || !Array.isArray(validData) || validData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli veri bulunamadı',
      });
    }

    // Get user ID from authenticated user
    const userId = req.user.userId || req.user.id;

    // Process import (şirket bağlamı oturumdan gelir, istemciden değil)
    const importResult = await BulkImportService.processImport(validData, userId, req.user.company_id);

    // Log import activity
    await ActivityLogService.log(
      userId,
      'import_products',
      'products',
      { 
        total: importResult.summary.total,
        success: importResult.summary.success,
        failed: importResult.summary.failed
      },
      req
    );

    return res.status(200).json({
      success: true,
      results: importResult.results,
      summary: importResult.summary,
    });
  } catch (error) {
    console.error('Import process error:', error);
    return res.status(500).json({
      success: false,
      error: 'Veri işlenirken bir hata oluştu',
    });
  }
};

module.exports = {
  validateImport,
  processImport,
};
