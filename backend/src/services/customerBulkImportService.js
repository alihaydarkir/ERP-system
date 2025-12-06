const pool = require('../config/database');

/**
 * Customer Bulk Import Service - Handles validation and database insertion for bulk customers
 */
class CustomerBulkImportService {
  /**
   * Validate customer import data
   * @param {Array} data - Parsed Excel data
   * @param {Number} userId - User ID who is performing the import
   * @returns {Object} - { preview, stats }
   */
  static async validateImportData(data, userId) {
    const preview = [];
    let validRows = 0;
    let invalidRows = 0;

    // Get existing tax numbers for duplicate check
    const existingTaxQuery = 'SELECT LOWER(tax_number) as tax_number FROM customers WHERE user_id = $1';
    const existingTaxResult = await pool.query(existingTaxQuery, [userId]);
    const existingTaxNumbers = new Set(existingTaxResult.rows.map(r => r.tax_number));

    // Track tax numbers within this import batch
    const batchTaxNumbers = new Set();

    for (const row of data) {
      const errors = [];
      const warnings = [];

      // Validate Ad Soyad (Full Name)
      if (!row.full_name || row.full_name.length === 0) {
        errors.push('Ad Soyad boş olamaz');
      } else if (row.full_name.length < 3) {
        errors.push('Ad Soyad en az 3 karakter olmalıdır');
      } else if (row.full_name.length > 100) {
        errors.push('Ad Soyad maksimum 100 karakter olabilir');
      }

      // Validate Şirket İsmi (Company Name)
      if (!row.company_name || row.company_name.length === 0) {
        errors.push('Şirket İsmi boş olamaz');
      } else if (row.company_name.length < 3) {
        errors.push('Şirket İsmi en az 3 karakter olmalıdır');
      } else if (row.company_name.length > 100) {
        errors.push('Şirket İsmi maksimum 100 karakter olabilir');
      }

      // Validate Vergi Dairesi (Tax Office)
      if (!row.tax_office || row.tax_office.length === 0) {
        errors.push('Vergi Dairesi boş olamaz');
      } else if (row.tax_office.length < 3) {
        errors.push('Vergi Dairesi en az 3 karakter olmalıdır');
      } else if (row.tax_office.length > 255) {
        errors.push('Vergi Dairesi maksimum 255 karakter olabilir');
      }

      // Validate Vergi Numarası (Tax Number)
      if (!row.tax_number || row.tax_number.length === 0) {
        errors.push('Vergi Numarası boş olamaz');
      } else if (row.tax_number.length < 10) {
        errors.push('Vergi Numarası en az 10 karakter olmalıdır');
      } else if (row.tax_number.length > 50) {
        errors.push('Vergi Numarası maksimum 50 karakter olabilir');
      } else {
        const lowerTaxNumber = row.tax_number.toLowerCase();
        if (existingTaxNumbers.has(lowerTaxNumber)) {
          errors.push('Bu vergi numarası veritabanında zaten mevcut');
        } else if (batchTaxNumbers.has(lowerTaxNumber)) {
          errors.push('Bu vergi numarası Excel dosyasında birden fazla kez kullanılmış');
        } else {
          batchTaxNumbers.add(lowerTaxNumber);
        }
      }

      // Validate Telefon Numarası (Phone Number) - optional
      if (row.phone_number) {
        const phoneStr = String(row.phone_number).trim();
        if (phoneStr.length > 0) {
          if (phoneStr.length < 10) {
            errors.push('Telefon Numarası en az 10 karakter olmalıdır');
          } else if (phoneStr.length > 20) {
            errors.push('Telefon Numarası maksimum 20 karakter olabilir');
          } else if (!/^[0-9+\-() ]+$/.test(phoneStr)) {
            errors.push('Telefon Numarası sadece rakam, +, -, (, ), boşluk içerebilir');
          }
        }
      }

      // Validate Şirket Konumu (Company Location) - optional
      if (row.company_location && row.company_location.length > 255) {
        errors.push('Şirket Konumu maksimum 255 karakter olabilir');
      }

      const isValid = errors.length === 0;
      if (isValid) validRows++;
      else invalidRows++;

      preview.push({
        rowIndex: row.rowIndex,
        data: row,
        isValid,
        errors,
        warnings,
      });
    }

    return {
      preview,
      stats: {
        totalRows: data.length,
        validRows,
        invalidRows,
      },
    };
  }

  /**
   * Process and import valid data into database
   * @param {Array} validData - Array of valid rows to import
   * @param {Number} userId - User ID who is performing the import
   * @returns {Object} - { results, summary }
   */
  static async processImport(validData, userId) {
    const results = [];
    let successful = 0;
    let failed = 0;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const item of validData) {
        try {
          // Insert customer
          const customerQuery = `
            INSERT INTO customers (
              user_id, full_name, company_name, tax_office, tax_number,
              phone_number, company_location, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id, full_name, company_name
          `;

          const customerResult = await client.query(customerQuery, [
            userId,
            item.full_name,
            item.company_name,
            item.tax_office,
            item.tax_number,
            item.phone_number || null,
            item.company_location || null,
          ]);

          successful++;
          results.push({
            rowIndex: item.rowIndex,
            success: true,
            customerId: customerResult.rows[0].id,
            customerName: customerResult.rows[0].full_name,
            companyName: customerResult.rows[0].company_name,
            message: 'Başarıyla eklendi',
          });
        } catch (error) {
          failed++;
          results.push({
            rowIndex: item.rowIndex,
            success: false,
            message: `Hata: ${error.message}`,
          });
        }
      }

      // Create audit log
      const auditQuery = `
        INSERT INTO audit_logs (user_id, action, entity_type, changes, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;

      await client.query(auditQuery, [
        userId,
        'BULK_IMPORT',
        'customers',
        JSON.stringify({
          totalRows: validData.length,
          successful,
          failed,
          timestamp: new Date().toISOString(),
        }),
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      results,
      summary: {
        total: validData.length,
        successful,
        failed,
      },
    };
  }
}

module.exports = CustomerBulkImportService;
