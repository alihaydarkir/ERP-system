const XLSX = require('xlsx');

/**
 * Excel Service - Handles Excel file parsing and validation
 */
class ExcelService {
  /**
   * Expected header format for products
   */
  static EXPECTED_HEADERS = ['Ürün Adı', 'Kategori', 'Fiyat', 'Stok Miktarı', 'Açıklama', 'Düşük Stok Limiti'];

  /**
   * Expected header format for customers
   */
  static EXPECTED_CUSTOMER_HEADERS = ['Ad Soyad', 'Şirket İsmi', 'Vergi Dairesi', 'Vergi Numarası', 'Telefon Numarası', 'Şirket Konumu'];

  /**
   * Parse Excel file buffer
   * @param {Buffer} buffer - Excel file buffer
   * @returns {Object} - { headers, data, rowCount, errors }
   */
  static parseExcelFile(buffer) {
    try {
      // Read workbook from buffer
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Excel dosyası boş');
      }

      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length === 0) {
        throw new Error('Excel dosyasında veri bulunamadı');
      }

      // Extract headers (first row)
      const headers = jsonData[0];

      // Validate headers
      const headerValidation = this.validateHeaders(headers);
      if (!headerValidation.isValid) {
        throw new Error(headerValidation.error);
      }

      // Extract data rows (skip header)
      const dataRows = jsonData.slice(1).filter(row => {
        // Filter out completely empty rows
        return row.some(cell => cell !== '' && cell !== null && cell !== undefined);
      });

      if (dataRows.length === 0) {
        throw new Error('Excel dosyasında veri satırı bulunamadı');
      }

      if (dataRows.length > 1000) {
        throw new Error('Excel dosyası maksimum 1000 satır içerebilir');
      }

      // Convert rows to objects
      const data = dataRows.map((row, index) => ({
        rowIndex: index + 2, // +2 because Excel rows start at 1 and we skipped header
        name: this.cleanString(row[0]),
        category: this.cleanString(row[1]),
        price: this.parseNumber(row[2]),
        stock: this.parseInteger(row[3]),
        description: this.cleanString(row[4]),
        low_stock_threshold: this.parseInteger(row[5]) || 10,
      }));

      return {
        success: true,
        headers,
        data,
        rowCount: data.length,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        headers: [],
        data: [],
        rowCount: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Validate Excel headers
   */
  static validateHeaders(headers) {
    if (!headers || headers.length === 0) {
      return { isValid: false, error: 'Excel dosyasında başlık satırı bulunamadı' };
    }

    const cleanHeaders = headers.map(h => this.cleanString(h));

    for (let i = 0; i < this.EXPECTED_HEADERS.length; i++) {
      if (cleanHeaders[i] !== this.EXPECTED_HEADERS[i]) {
        return {
          isValid: false,
          error: `Beklenen başlık: "${this.EXPECTED_HEADERS[i]}", Bulunan: "${cleanHeaders[i] || 'boş'}"`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Clean and trim string values
   */
  static cleanString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /**
   * Parse number value
   */
  static parseNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Parse integer value
   */
  static parseInteger(value) {
    if (value === '' || value === null || value === undefined) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Parse Excel file buffer for customers
   * @param {Buffer} buffer - Excel file buffer
   * @returns {Object} - { headers, data, rowCount, errors }
   */
  static parseCustomerExcelFile(buffer) {
    try {
      // Read workbook from buffer
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Excel dosyası boş');
      }

      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length === 0) {
        throw new Error('Excel dosyasında veri bulunamadı');
      }

      // Extract headers (first row)
      const headers = jsonData[0];

      // Validate headers
      const headerValidation = this.validateCustomerHeaders(headers);
      if (!headerValidation.isValid) {
        throw new Error(headerValidation.error);
      }

      // Extract data rows (skip header)
      const dataRows = jsonData.slice(1).filter(row => {
        // Filter out completely empty rows
        return row.some(cell => cell !== '' && cell !== null && cell !== undefined);
      });

      if (dataRows.length === 0) {
        throw new Error('Excel dosyasında veri satırı bulunamadı');
      }

      if (dataRows.length > 1000) {
        throw new Error('Excel dosyası maksimum 1000 satır içerebilir');
      }

      // Convert rows to objects
      const data = dataRows.map((row, index) => ({
        rowIndex: index + 2, // +2 because Excel rows start at 1 and we skipped header
        full_name: this.cleanString(row[0]),
        company_name: this.cleanString(row[1]),
        tax_office: this.cleanString(row[2]),
        tax_number: this.cleanString(row[3]),
        phone_number: this.cleanString(row[4]),
        company_location: this.cleanString(row[5]),
      }));

      return {
        success: true,
        headers,
        data,
        rowCount: data.length,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        headers: [],
        data: [],
        rowCount: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Validate Excel headers for customers
   */
  static validateCustomerHeaders(headers) {
    if (!headers || headers.length === 0) {
      return { isValid: false, error: 'Excel dosyasında başlık satırı bulunamadı' };
    }

    const cleanHeaders = headers.map(h => this.cleanString(h));

    for (let i = 0; i < this.EXPECTED_CUSTOMER_HEADERS.length; i++) {
      if (cleanHeaders[i] !== this.EXPECTED_CUSTOMER_HEADERS[i]) {
        return {
          isValid: false,
          error: `Beklenen başlık: "${this.EXPECTED_CUSTOMER_HEADERS[i]}", Bulunan: "${cleanHeaders[i] || 'boş'}"`,
        };
      }
    }

    return { isValid: true };
  }
}

module.exports = ExcelService;
