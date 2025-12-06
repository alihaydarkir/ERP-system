const xlsx = require('xlsx');
const { Cheque, ChequeTransaction } = require('../models/Cheque');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { formatSuccess, formatError } = require('../utils/formatters');
const { getClientIP } = require('../utils/helpers');

/**
 * Parse Excel file and return data
 */
const parseExcelFile = (fileBuffer) => {
  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet, { raw: false });

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Validate and transform Excel data
 */
const validateExcelData = async (data, userId) => {
  const validRows = [];
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // Excel row number (1-based + header)

    try {
      // Required field validation
      const requiredFields = [
        'Seri No',
        'Keşideci',
        'Müşteri',
        'Banka',
        'Alınma Tarihi',
        'Vade Tarihi',
        'Tutar'
      ];

      const missingFields = requiredFields.filter(field => !row[field]);
      if (missingFields.length > 0) {
        errors.push({
          row: rowNum,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          data: row
        });
        continue;
      }

      // Parse dates
      const receivedDate = parseExcelDate(row['Alınma Tarihi']);
      const dueDate = parseExcelDate(row['Vade Tarihi']);

      if (!receivedDate || !dueDate) {
        errors.push({
          row: rowNum,
          error: 'Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD',
          data: row
        });
        continue;
      }

      if (dueDate <= receivedDate) {
        errors.push({
          row: rowNum,
          error: 'Due date must be after received date',
          data: row
        });
        continue;
      }

      // Parse amount
      const amount = parseFloat(String(row['Tutar']).replace(/[,]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        errors.push({
          row: rowNum,
          error: 'Invalid amount. Must be a positive number',
          data: row
        });
        continue;
      }

      // Validate currency
      const currency = row['Para Birimi'] || 'TRY';
      const validCurrencies = ['TRY', 'USD', 'EUR', 'GBP'];
      if (!validCurrencies.includes(currency.toUpperCase())) {
        errors.push({
          row: rowNum,
          error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}`,
          data: row
        });
        continue;
      }

       // Find or create customer
      let customerId = null;
      const customerIdentifier = row['Müşteri'];

      // Try to find customer by company name or tax number
      const customers = await Customer.findAll({ user_id: userId, search: customerIdentifier });

      if (customers.length === 0) {
        // Customer not found - auto-create with minimal info
        try {
          const newCustomer = await Customer.create({
            user_id: userId,
            full_name: customerIdentifier,
            company_name: customerIdentifier,
            tax_office: 'Unknown',
            tax_number: '0000000000',
            phone_number: null,
            company_location: null
          });
          customerId = newCustomer.id;
        } catch (createError) {
          errors.push({
            row: rowNum,
            error: `Failed to auto-create customer: ${customerIdentifier}. ${createError.message}`,
            data: row
          });
          continue;
        }
      } else if (customers.length > 1) {
        errors.push({
          row: rowNum,
          error: `Multiple customers found for: ${customerIdentifier}. Please use unique identifier.`,
          data: row
        });
        continue;
      } else {
        customerId = customers[0].id;
      }

      // Check for duplicate cheque
      const existingCheque = await Cheque.findBySerialAndBank(
        String(row['Seri No']).trim(),
        String(row['Banka']).trim()
      );

      if (existingCheque) {
        errors.push({
          row: rowNum,
          error: `Duplicate cheque: Serial ${row['Seri No']} from ${row['Banka']} already exists`,
          data: row
        });
        continue;
      }

      // Valid row - add to valid rows
      validRows.push({
        user_id: userId,
        check_serial_no: String(row['Seri No']).trim(),
        check_issuer: String(row['Keşideci']).trim(),
        customer_id: customerId,
        bank_name: String(row['Banka']).trim(),
        received_date: receivedDate,
        due_date: dueDate,
        amount: amount,
        currency: currency.toUpperCase(),
        status: 'pending',
        notes: row['Notlar'] || null
      });

    } catch (error) {
      errors.push({
        row: rowNum,
        error: error.message,
        data: row
      });
    }
  }

  return { validRows, errors };
};

/**
 * Parse Excel date formats (DD/MM/YYYY or YYYY-MM-DD or Excel serial)
 */
const parseExcelDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    // If it's an Excel serial number
    if (!isNaN(dateValue)) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
      return date.toISOString().split('T')[0];
    }

    // If it's a string date
    const dateStr = String(dateValue).trim();

    // Try DD/MM/YYYY format
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    // Try parsing as Date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Validate Excel import (preview mode)
 * POST /api/cheques/import/validate
 */
const validateChequeImport = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json(formatError('No file uploaded'));
    }

    // Parse Excel file
    const parseResult = parseExcelFile(req.file.buffer);

    if (!parseResult.success) {
      return res.status(400).json(formatError(`Failed to parse Excel file: ${parseResult.error}`));
    }

    if (!parseResult.data || parseResult.data.length === 0) {
      return res.status(400).json(formatError('Excel file is empty'));
    }

    // Validate data
    const validationResult = await validateExcelData(parseResult.data, userId);

    res.json(formatSuccess({
      totalRows: parseResult.data.length,
      validRows: validationResult.validRows.length,
      errorRows: validationResult.errors.length,
      validData: validationResult.validRows,
      errors: validationResult.errors
    }));

  } catch (error) {
    console.error('Validate cheque import error:', error);
    res.status(500).json(formatError('Failed to validate import file'));
  }
};

/**
 * Import cheques from Excel
 * POST /api/cheques/import
 */
const importCheques = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json(formatError('No file uploaded'));
    }

    // Parse Excel file
    const parseResult = parseExcelFile(req.file.buffer);

    if (!parseResult.success) {
      return res.status(400).json(formatError(`Failed to parse Excel file: ${parseResult.error}`));
    }

    if (!parseResult.data || parseResult.data.length === 0) {
      return res.status(400).json(formatError('Excel file is empty'));
    }

    // Validate data
    const validationResult = await validateExcelData(parseResult.data, userId);

    if (validationResult.validRows.length === 0) {
      return res.status(400).json(formatError('No valid rows to import', {
        errors: validationResult.errors
      }));
    }

    // Bulk insert valid rows
    const bulkResult = await Cheque.bulkCreate(validationResult.validRows);

    // Create transaction records for successfully inserted cheques
    for (const cheque of bulkResult.insertedCheques) {
      await ChequeTransaction.create({
        cheque_id: cheque.id,
        old_status: null,
        new_status: 'pending',
        changed_by: userId,
        notes: 'Cheque imported from Excel',
        ip_address: getClientIP(req)
      });
    }

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'IMPORT_CHEQUES',
      entity_type: 'cheque',
      entity_id: null,
      ip_address: getClientIP(req),
      changes: {
        total_rows: parseResult.data.length,
        imported: bulkResult.insertedCheques.length,
        failed: validationResult.errors.length + bulkResult.errors.length
      }
    });

    res.json(formatSuccess({
      message: `Successfully imported ${bulkResult.insertedCheques.length} cheques`,
      imported: bulkResult.insertedCheques.length,
      failed: validationResult.errors.length + bulkResult.errors.length,
      errors: [...validationResult.errors, ...bulkResult.errors]
    }));

  } catch (error) {
    console.error('Import cheques error:', error);
    res.status(500).json(formatError('Failed to import cheques'));
  }
};

/**
 * Export cheques to Excel
 * GET /api/cheques/export/excel
 */
const exportChequesToExcel = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      status,
      customer_id,
      bank_name,
      start_date,
      end_date
    } = req.query;

    // Get cheques with filters (no limit)
    const filters = {
      user_id: userId,
      status,
      customer_id: customer_id ? parseInt(customer_id) : undefined,
      bank_name,
      start_date,
      end_date,
      limit: 10000, // Large limit for export
      offset: 0
    };

    const cheques = await Cheque.findAll(filters);

    if (cheques.length === 0) {
      return res.status(404).json(formatError('No cheques found to export'));
    }

    // Prepare data for Excel
    const excelData = cheques.map((cheque) => ({
      'Seri No': cheque.check_serial_no,
      'Keşideci': cheque.check_issuer,
      'Müşteri Şirketi': cheque.customer_company_name || '',
      'Müşteri İlgili': cheque.customer_contact_name || '',
      'Banka': cheque.bank_name,
      'Alınma Tarihi': formatDateForExcel(cheque.received_date),
      'Vade Tarihi': formatDateForExcel(cheque.due_date),
      'Tutar': parseFloat(cheque.amount),
      'Para Birimi': cheque.currency,
      'Durum': getStatusLabel(cheque.status),
      'Kalan Gün': cheque.days_until_due || '',
      'Notlar': cheque.notes || ''
    }));

    // Create workbook
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Seri No
      { wch: 25 }, // Keşideci
      { wch: 25 }, // Müşteri Şirketi
      { wch: 20 }, // Müşteri İlgili
      { wch: 20 }, // Banka
      { wch: 12 }, // Alınma Tarihi
      { wch: 12 }, // Vade Tarihi
      { wch: 12 }, // Tutar
      { wch: 8 },  // Para Birimi
      { wch: 12 }, // Durum
      { wch: 10 }, // Kalan Gün
      { wch: 30 }  // Notlar
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Çekler');

    // Generate buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'EXPORT_CHEQUES',
      entity_type: 'cheque',
      entity_id: null,
      ip_address: getClientIP(req),
      changes: { count: cheques.length, filters }
    });

    // Send file
    const filename = `cekler_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Export cheques to Excel error:', error);
    res.status(500).json(formatError('Failed to export cheques'));
  }
};

/**
 * Download Excel template
 * GET /api/cheques/import/template
 */
const downloadTemplate = async (req, res) => {
  try {
    // Create template data with example row
    const templateData = [
      {
        'Seri No': '1234567',
        'Keşideci': 'ABC Ltd. Şti.',
        'Müşteri': 'Acme Inc',
        'Banka': 'Garanti Bankası',
        'Alınma Tarihi': '05/11/2025',
        'Vade Tarihi': '05/12/2025',
        'Tutar': '50000',
        'Para Birimi': 'TRY',
        'Notlar': 'Örnek çek'
      }
    ];

    // Create workbook
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Seri No
      { wch: 25 }, // Keşideci
      { wch: 25 }, // Müşteri
      { wch: 20 }, // Banka
      { wch: 12 }, // Alınma Tarihi
      { wch: 12 }, // Vade Tarihi
      { wch: 12 }, // Tutar
      { wch: 12 }, // Para Birimi
      { wch: 30 }  // Notlar
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Çekler');

    // Generate buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cek_sablonu.xlsx"');
    res.send(excelBuffer);

  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json(formatError('Failed to download template'));
  }
};

/**
 * Helper: Format date for Excel export
 */
const formatDateForExcel = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Helper: Get status label in Turkish
 */
const getStatusLabel = (status) => {
  const labels = {
    'pending': 'Beklemede',
    'cleared': 'Ödendi',
    'bounced': 'Bozuldu',
    'cancelled': 'İptal'
  };
  return labels[status] || status;
};

module.exports = {
  validateChequeImport,
  importCheques,
  exportChequesToExcel,
  downloadTemplate
};
