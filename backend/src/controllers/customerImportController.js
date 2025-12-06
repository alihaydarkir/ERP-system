const ExcelService = require('../services/excelService');
const CustomerBulkImportService = require('../services/customerBulkImportService');

/**
 * Customer Import Controller - Handles Excel import endpoints for customers
 */

/**
 * Validate customer Excel file and preview data
 * POST /api/customers/import/validate
 */
const validateCustomerImport = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Dosya yüklenmedi',
      });
    }

    // Parse Excel file
    const parseResult = ExcelService.parseCustomerExcelFile(req.file.buffer);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.errors.join(', '),
      });
    }

    // Get user ID from auth middleware
    const userId = req.user.id;

    // Validate data
    const validationResult = await CustomerBulkImportService.validateImportData(parseResult.data, userId);

    return res.status(200).json({
      success: true,
      preview: validationResult.preview,
      stats: validationResult.stats,
    });
  } catch (error) {
    console.error('Customer import validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Dosya doğrulanırken bir hata oluştu',
    });
  }
};

/**
 * Process valid customer import data
 * POST /api/customers/import/process
 */
const processCustomerImport = async (req, res) => {
  try {
    const { validData } = req.body;

    if (!validData || !Array.isArray(validData) || validData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli veri bulunamadı',
      });
    }

    // Get user ID from authenticated user
    const userId = req.user.id;

    // Process import
    const importResult = await CustomerBulkImportService.processImport(validData, userId);

    return res.status(200).json({
      success: true,
      results: importResult.results,
      summary: importResult.summary,
    });
  } catch (error) {
    console.error('Customer import process error:', error);
    return res.status(500).json({
      success: false,
      error: 'Veri işlenirken bir hata oluştu',
    });
  }
};

module.exports = {
  validateCustomerImport,
  processCustomerImport,
};
