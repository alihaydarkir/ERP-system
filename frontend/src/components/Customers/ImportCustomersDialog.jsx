import { useState } from 'react';
import axios from 'axios';

export default function ImportCustomersDialog({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      alert('❌ Sadece Excel dosyaları (.xlsx, .xls) yüklenebilir');
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('❌ Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setFile(selectedFile);
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!file) {
      alert('❌ Lütfen bir dosya seçin');
      return;
    }

    try {
      setValidating(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('http://localhost:5000/api/customers/import/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setValidationResult(response.data);
      } else {
        alert(`❌ Doğrulama hatası: ${response.data.error}`);
        setValidationResult(null);
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert(`❌ Doğrulama hatası: ${error.response?.data?.error || error.message}`);
    } finally {
      setValidating(false);
    }
  };

  const handleProcess = async () => {
    if (!validationResult) {
      alert('❌ Önce dosyayı doğrulayın');
      return;
    }

    if (validationResult.stats.validRows === 0) {
      alert('❌ Yüklenecek geçerli satır bulunamadı');
      return;
    }

    const validData = validationResult.preview
      .filter((row) => row.isValid)
      .map((row) => row.data);

    try {
      setProcessing(true);
      const response = await axios.post('http://localhost:5000/api/customers/import/process',
        { validData },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert(`✅ Başarılı! ${response.data.summary.successful} müşteri eklendi, ${response.data.summary.failed} başarısız.`);
        onSuccess();
        handleClose();
      } else {
        alert(`❌ İşlem hatası: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Process error:', error);
      alert(`❌ İşlem hatası: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📥 Excel'den Müşteri Yükle</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Excel Dosya Formatı:</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Header (1. Satır):</strong> Ad Soyad | Şirket İsmi | Vergi Dairesi | Vergi Numarası | Telefon Numarası | Şirket Konumu</p>
              <p><strong>Maksimum:</strong> 1000 satır, 5MB dosya boyutu</p>
              <p><strong>Format:</strong> .xlsx veya .xls</p>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-600 hover:text-red-800 text-sm underline"
                >
                  Dosyayı Kaldır
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-5xl">📁</div>
                <div>
                  <p className="text-gray-700 dark:text-gray-200 font-medium mb-2">
                    Dosyayı buraya sürükle bırak
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">veya</p>
                  <label className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block">
                    Dosya Seç
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Validate Button */}
          {file && !validationResult && (
            <button
              onClick={handleValidate}
              disabled={validating}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {validating ? '🔄 Doğrulanıyor...' : '✅ Dosyayı Doğrula'}
            </button>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">📊 Doğrulama Sonuçları:</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                      {validationResult.stats.totalRows}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Toplam Satır</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {validationResult.stats.validRows}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Geçerli</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {validationResult.stats.invalidRows}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Geçersiz</p>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Satır</th>
                      <th className="px-4 py-2 text-left">Ad Soyad</th>
                      <th className="px-4 py-2 text-left">Şirket</th>
                      <th className="px-4 py-2 text-left">Vergi No</th>
                      <th className="px-4 py-2 text-left">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.preview.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-t ${
                          row.isValid ? 'bg-white dark:bg-gray-800' : 'bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <td className="px-4 py-2">{row.rowIndex}</td>
                        <td className="px-4 py-2">{row.data.full_name}</td>
                        <td className="px-4 py-2">{row.data.company_name}</td>
                        <td className="px-4 py-2">{row.data.tax_number}</td>
                        <td className="px-4 py-2">
                          {row.isValid ? (
                            <span className="text-green-600 font-semibold">✅ Geçerli</span>
                          ) : (
                            <div>
                              <span className="text-red-600 font-semibold">❌ Hata</span>
                              <ul className="text-xs text-red-600 mt-1">
                                {row.errors.map((err, i) => (
                                  <li key={i}>• {err}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setFile(null);
                    setValidationResult(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 dark:text-gray-100 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  🔄 Başka Dosya Seç
                </button>
                <button
                  onClick={handleProcess}
                  disabled={processing || validationResult.stats.validRows === 0}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processing
                    ? '⏳ Yükleniyor...'
                    : `📤 ${validationResult.stats.validRows} Müşteriyi Yükle`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
