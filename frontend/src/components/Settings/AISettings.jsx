import { useState, useEffect } from 'react';
import useSettingsStore from '../../store/settingsStore';
import useUIStore from '../../store/uiStore';

export default function AISettings() {
  const { settings, updateSetting, isLoading } = useSettingsStore();
  const { showSuccess, showError } = useUIStore();
  const [formData, setFormData] = useState({
    aiOllamaUrl: 'http://localhost:11434',
    aiModel: 'llama2',
    aiRagTopK: '5',
    aiTemperature: '0.7'
  });

  useEffect(() => {
    if (settings.ai) {
      setFormData({
        aiOllamaUrl: settings.ai.aiOllamaUrl || 'http://localhost:11434',
        aiModel: settings.ai.aiModel || 'llama2',
        aiRagTopK: settings.ai.aiRagTopK || '5',
        aiTemperature: settings.ai.aiTemperature || '0.7'
      });
    }
  }, [settings.ai]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSetting('ai', formData);
      showSuccess('AI ayarları başarıyla kaydedildi!');
    } catch (error) {
      showError(error.response?.data?.message || 'Ayarlar kaydedilirken hata oluştu');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">AI/Chatbot Ayarları</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Yapay zeka ve chatbot ayarlarını yapın</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Ollama URL
        </label>
        <input
          type="text"
          name="aiOllamaUrl"
          value={formData.aiOllamaUrl}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="http://localhost:11434"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          AI Model
        </label>
        <select
          name="aiModel"
          value={formData.aiModel}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="llama2">Llama 2</option>
          <option value="mistral">Mistral</option>
          <option value="codellama">Code Llama</option>
          <option value="phi">Phi</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          RAG Top K
        </label>
        <input
          type="number"
          name="aiRagTopK"
          value={formData.aiRagTopK}
          onChange={handleChange}
          min="1"
          max="20"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">RAG sonuçlarından kaç tanesinin döndürüleceği</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Temperature: {formData.aiTemperature}
        </label>
        <input
          type="range"
          name="aiTemperature"
          value={formData.aiTemperature}
          onChange={handleChange}
          min="0"
          max="1"
          step="0.1"
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Daha Tutarlı (0.0)</span>
          <span>Daha Yaratıcı (1.0)</span>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
