const pool = require('../config/database');
const { generateSKU } = require('../utils/helpers');

/**
 * Bulk Import Service - Handles validation and database insertion for bulk products
 */
class BulkImportService {
  /**
   * Validate import data
   * @param {Array} data - Parsed Excel data
   * @returns {Object} - { preview, stats }
   */
  static async validateImportData(data) {
    const preview = [];
    let validRows = 0;
    let invalidRows = 0;

    // Get existing product names for duplicate check
    const existingNamesQuery = 'SELECT LOWER(name) as name FROM products';
    const existingNamesResult = await pool.query(existingNamesQuery);
    const existingNames = new Set(existingNamesResult.rows.map(r => r.name));

    // Get existing categories
    const categoriesQuery = 'SELECT DISTINCT LOWER(category) as category FROM products WHERE category IS NOT NULL';
    const categoriesResult = await pool.query(categoriesQuery);
    const existingCategories = new Set(categoriesResult.rows.map(r => r.category));

    // Track names within this import batch
    const batchNames = new Set();

    for (const row of data) {
      const errors = [];
      const warnings = [];

      // Validate Ürün Adı (Product Name)
      if (!row.name || row.name.length === 0) {
        errors.push('Ürün adı boş olamaz');
      } else if (row.name.length > 200) {
        errors.push('Ürün adı maksimum 200 karakter olabilir');
      } else {
        const lowerName = row.name.toLowerCase();
        if (existingNames.has(lowerName)) {
          errors.push('Bu ürün adı veritabanında zaten mevcut');
        } else if (batchNames.has(lowerName)) {
          errors.push('Bu ürün adı Excel dosyasında birden fazla kez kullanılmış');
        } else {
          batchNames.add(lowerName);
        }
      }

      // Validate Kategori (Category)
      if (!row.category || row.category.length === 0) {
        errors.push('Kategori boş olamaz');
      } else {
        const lowerCategory = row.category.toLowerCase();
        if (!existingCategories.has(lowerCategory)) {
          warnings.push('Bu kategori veritabanında mevcut değil, yeni kategori olarak eklenecek');
        }
      }

      // Validate Fiyat (Price)
      if (row.price === null || row.price === undefined) {
        errors.push('Fiyat boş olamaz');
      } else if (typeof row.price !== 'number' || row.price <= 0) {
        errors.push('Fiyat pozitif bir sayı olmalıdır');
      } else {
        // Check decimal places
        const decimalPlaces = (row.price.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          errors.push('Fiyat maksimum 2 ondalık basamak içerebilir');
        }
      }

      // Validate Stok Miktarı (Stock)
      if (row.stock === null || row.stock === undefined) {
        errors.push('Stok miktarı boş olamaz');
      } else if (!Number.isInteger(row.stock) || row.stock < 0) {
        errors.push('Stok miktarı 0 veya pozitif bir tam sayı olmalıdır');
      } else if (row.stock > 99999) {
        errors.push('Stok miktarı maksimum 99999 olabilir');
      }

      // Validate Açıklama (Description) - optional
      if (row.description && row.description.length > 500) {
        errors.push('Açıklama maksimum 500 karakter olabilir');
      }

      // Validate Düşük Stok Limiti (Low Stock Threshold) - optional
      if (row.low_stock_threshold !== null && row.low_stock_threshold !== undefined) {
        if (!Number.isInteger(row.low_stock_threshold) || row.low_stock_threshold < 0) {
          errors.push('Düşük stok limiti 0 veya pozitif bir tam sayı olmalıdır');
        } else if (row.low_stock_threshold > 9999) {
          errors.push('Düşük stok limiti maksimum 9999 olabilir');
        }
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
          // Generate SKU
          const sku = generateSKU(item.category.substring(0, 3).toUpperCase());

          // Insert product
          const productQuery = `
            INSERT INTO products (name, sku, category, price, stock_quantity, description, low_stock_threshold, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id, name
          `;

          const productResult = await client.query(productQuery, [
            item.name,
            sku,
            item.category,
            item.price,
            item.stock,
            item.description || null,
            item.low_stock_threshold || 10,
          ]);

          successful++;
          results.push({
            rowIndex: item.rowIndex,
            success: true,
            productId: productResult.rows[0].id,
            productName: productResult.rows[0].name,
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
        'products',
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

module.exports = BulkImportService;
