import React, { useState } from 'react';
import chequeService from '../../services/chequeService';

const ChequeExcelImport = ({ onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setValidationResult(null);
        setImportResult(null);
      } else {
        alert('Lütfen geçerli bir Excel dosyası seçin (.xlsx veya .xls)');
      }
    }
  };

  const handleValidate = async () => {
    if (!file) {
      alert('Lütfen önce bir dosya seçin');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await chequeService.validateImport(file);
      if (response.success) {
        setValidationResult(response.data);
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert('Dosya doğrulama sırasında hata oluştu');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('Lütfen önce bir dosya seçin');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await chequeService.import(file);
      if (response.success) {
        setImportResult(response.data);
        if (onImportComplete) {
          setTimeout(() => {
            onImportComplete();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Dosya içe aktarma sırasında hata oluştu');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await chequeService.downloadTemplate();
    } catch (error) {
      console.error('Download template error:', error);
      alert('Şablon indirme sırasında hata oluştu');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Excel'den Çek İçe Aktar</h2>
              <p className="text-green-100 mt-1">Toplu çek yükleme işlemi</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">📋 Excel Şablonu</h3>
                <p className="text-sm text-blue-700">
                  İlk kez yükleme yapıyorsanız, önce şablonu indirip doldurun
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Şablonu İndir
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excel Dosyası Seçin
            </label>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-6xl mb-4">📊</div>

              {file ? (
                <div>
                  <p className="text-green-600 font-medium mb-2">✓ Dosya Seçildi</p>
                  <p className="text-sm text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => setFile(null)}
                    className="mt-3 text-sm text-red-600 hover:text-red-800"
                  >
                    Dosyayı Kaldır
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 font-medium mb-2">
                    Dosyayı buraya sürükleyin veya tıklayın
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileChange(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition cursor-pointer"
                  >
                    Dosya Seç
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Sadece .xlsx ve .xls dosyaları desteklenir
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Validation Button */}
          {file && !importResult && (
            <div className="flex space-x-3">
              <button
                onClick={handleValidate}
                disabled={isValidating}
                className="flex-1 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isValidating ? 'Doğrulanıyor...' : '🔍 Önizleme & Doğrula'}
              </button>

              {validationResult && validationResult.validRows > 0 && (
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isImporting ? 'İçe Aktarılıyor...' : '✓ İçe Aktar'}
                </button>
              )}
            </div>
          )}

          {/* Validation Result */}
          {validationResult && !importResult && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Doğrulama Sonucu</h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-100 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{validationResult.totalRows}</div>
                  <div className="text-sm text-blue-700 mt-1">Toplam Satır</div>
                </div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{validationResult.validRows}</div>
                  <div className="text-sm text-green-700 mt-1">Geçerli Satır</div>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-red-600">{validationResult.errorRows}</div>
                  <div className="text-sm text-red-700 mt-1">Hatalı Satır</div>
                </div>
              </div>

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-700 mb-2">Hatalar:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {validationResult.errors.map((error, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm font-medium text-red-800">
                          Satır {error.row}: {error.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="border border-green-200 rounded-lg p-6 bg-green-50">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  İçe Aktarma Tamamlandı!
                </h3>
                <p className="text-green-700 mb-4">{importResult.message}</p>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <div className="text-sm text-gray-700">Başarılı</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-gray-700">Başarısız</div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChequeExcelImport;
