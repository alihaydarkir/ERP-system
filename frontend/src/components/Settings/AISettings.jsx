import { useState, useEffect, useCallback } from 'react';
import useSettingsStore from '../../store/settingsStore';
import useUIStore from '../../store/uiStore';
import api from '../../services/api';

const SPINNER = '⏳';

function SectionTitle({ title, desc }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
      {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
    </div>
  );
}

export default function AISettings() {
  const { settings, updateSetting, isLoading } = useSettingsStore();
  const { showSuccess, showError } = useUIStore();

  /* ── Temel AI ayarları ── */
  const [formData, setFormData] = useState({
    aiOllamaUrl: 'http://localhost:11434',
    aiModel: 'llama2',
    aiRagTopK: '5',
    aiTemperature: '0.7',
  });

  useEffect(() => {
    if (settings.ai) {
      setFormData({
        aiOllamaUrl:    settings.ai.aiOllamaUrl    || 'http://localhost:11434',
        aiModel:        settings.ai.aiModel        || 'llama2',
        aiRagTopK:      settings.ai.aiRagTopK      || '5',
        aiTemperature:  settings.ai.aiTemperature  || '0.7',
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
      showSuccess('AI ayarları kaydedildi!');
    } catch (err) {
      showError(err.response?.data?.message || 'Ayarlar kaydedilemedi');
    }
  };

  /* ── Fine-Tuning bölümü ── */
  const [ftLoading, setFtLoading] = useState(false);
  const [ftModels, setFtModels] = useState([]);
  const [ftDatasets, setFtDatasets] = useState([]);
  const [ftStats, setFtStats] = useState(null);
  const [ftLog, setFtLog] = useState('');
  const [newModelName, setNewModelName] = useState('erp-custom');
  const [testPrompt, setTestPrompt] = useState('Vadesi geçmiş çeklerimi göster');
  const [testResult, setTestResult] = useState('');

  const ftCall = useCallback(async (fn) => {
    setFtLoading(true);
    setFtLog('');
    try {
      const res = await fn();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Hata';
      setFtLog(`❌ ${msg}`);
      showError(msg);
      return null;
    } finally {
      setFtLoading(false);
    }
  }, [showError]);

  const loadFtStatus = useCallback(async () => {
    const [models, datasets, stats] = await Promise.all([
      api.get('/api/fine-tuning/models').catch(() => ({ data: { data: [] } })),
      api.get('/api/fine-tuning/datasets').catch(() => ({ data: { data: [] } })),
      api.get('/api/fine-tuning/statistics').catch(() => ({ data: { data: null } })),
    ]);
    setFtModels(models.data?.data || []);
    setFtDatasets(datasets.data?.data || []);
    setFtStats(stats.data?.data || null);
  }, []);

  useEffect(() => { loadFtStatus(); }, [loadFtStatus]);

  const handleInitialize = () => ftCall(async () => {
    const r = await api.post('/api/fine-tuning/initialize');
    setFtLog('✅ Servis başlatıldı. Dizinler oluşturuldu.');
    await loadFtStatus();
    return r;
  });

  const handleGenerateDataset = () => ftCall(async () => {
    setFtLog(`${SPINNER} Dataset oluşturuluyor...`);
    const r = await api.post('/api/fine-tuning/dataset/generate');
    setFtLog('✅ Türkçe ERP dataset oluşturuldu!');
    await loadFtStatus();
    return r;
  });

  const handleCreateModel = () => ftCall(async () => {
    if (!newModelName.trim()) { showError('Model adı giriniz'); return; }
    setFtLog(`${SPINNER} Model oluşturuluyor: ${newModelName}...`);
    const r = await api.post('/api/fine-tuning/model/create', { modelName: newModelName, baseModel: formData.aiModel });
    setFtLog(`✅ Model başarıyla oluşturuldu: ${newModelName}`);
    await loadFtStatus();
    return r;
  });

  const handleTestModel = () => ftCall(async () => {
    if (!testPrompt.trim()) { showError('Test sorusu giriniz'); return; }
    setFtLog(`${SPINNER} Model test ediliyor...`);
    setTestResult('');
    const r = await api.post('/api/fine-tuning/model/test', { prompt: testPrompt, modelName: newModelName });
    setTestResult(r.data?.data?.response || r.data?.message || 'Yanıt alınamadı');
    setFtLog('✅ Test tamamlandı');
    return r;
  });

  const handleDeleteModel = (modelName) => ftCall(async () => {
    const r = await api.delete(`/api/fine-tuning/model/${modelName}`);
    setFtLog(`✅ Model silindi: ${modelName}`);
    await loadFtStatus();
    return r;
  });

  const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white text-sm';

  return (
    <div className="space-y-8">

      {/* ── Temel AI Ayarları ── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">AI/Chatbot Ayarları</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ollama bağlantısı ve model parametreleri</p>
        </div>

        <SectionTitle title="Model Bağlantısı" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ollama URL</label>
            <input type="text" name="aiOllamaUrl" value={formData.aiOllamaUrl} onChange={handleChange} className={inputClass} placeholder="http://localhost:11434" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">AI Model</label>
            <select name="aiModel" value={formData.aiModel} onChange={handleChange} className={inputClass}>
              <option value="llama2">Llama 2</option>
              <option value="llama3">Llama 3</option>
              <option value="mistral">Mistral</option>
              <option value="mistral-nemo">Mistral Nemo</option>
              <option value="codellama">Code Llama</option>
              <option value="phi">Phi</option>
              <option value="gemma2">Gemma 2</option>
              <option value="qwen2">Qwen 2</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">RAG Top K</label>
            <input type="number" name="aiRagTopK" value={formData.aiRagTopK} onChange={handleChange} min="1" max="20" className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">Kaç RAG sonucu kullanılacak</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Temperature: <span className="text-blue-600">{formData.aiTemperature}</span>
          </label>
          <input type="range" name="aiTemperature" value={formData.aiTemperature} onChange={handleChange} min="0" max="1" step="0.1" className="w-full" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Tutarlı (0.0)</span>
            <span>Yaratıcı (1.0)</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isLoading} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium">
            {isLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>

      {/* ── Fine-Tuning Bölümü ── */}
      <div className="space-y-5 border-t border-gray-200 dark:border-gray-700 pt-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Model Fine-Tuning</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ERP verilerinizle özelleştirilmiş AI modeli oluşturun
          </p>
        </div>

        {/* İstatistikler */}
        {ftStats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Toplam Model', value: ftStats.totalModels ?? ftModels.length },
              { label: 'Dataset Sayısı', value: ftStats.totalDatasets ?? ftDatasets.length },
              { label: 'Eğitim Örneği', value: ftStats.totalExamples ?? '-' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Adım Adım İş Akışı */}
        <SectionTitle title="İş Akışı" desc="Sırasıyla adımları tamamlayın" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StepCard step="1" title="Servisi Başlat" desc="Gerekli dizinleri oluştur">
            <button onClick={handleInitialize} disabled={ftLoading} className="mt-2 w-full px-3 py-1.5 bg-gray-800 dark:bg-gray-600 text-white text-xs rounded-lg hover:opacity-90 disabled:opacity-40">
              {ftLoading ? SPINNER : 'Başlat'}
            </button>
          </StepCard>
          <StepCard step="2" title="Dataset Oluştur" desc="Türkçe ERP eğitim verisi">
            <button onClick={handleGenerateDataset} disabled={ftLoading} className="mt-2 w-full px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:opacity-90 disabled:opacity-40">
              {ftLoading ? SPINNER : 'Dataset Oluştur'}
            </button>
            {ftDatasets.length > 0 && (
              <p className="text-xs text-green-600 mt-1">{ftDatasets.length} dataset mevcut</p>
            )}
          </StepCard>
          <StepCard step="3" title="Model Oluştur" desc="Özelleştirilmiş model eğit">
            <input
              value={newModelName}
              onChange={e => setNewModelName(e.target.value)}
              placeholder="erp-custom"
              className="mt-2 w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            />
            <button onClick={handleCreateModel} disabled={ftLoading} className="mt-1 w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:opacity-90 disabled:opacity-40">
              {ftLoading ? SPINNER : 'Oluştur'}
            </button>
          </StepCard>
        </div>

        {/* Log çıktısı */}
        {ftLog && (
          <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-green-400 min-h-8">
            {ftLog}
          </div>
        )}

        {/* Model Testi */}
        <SectionTitle title="Model Test" desc="Oluşturulan modeli dene" />
        <div className="space-y-2">
          <input
            value={testPrompt}
            onChange={e => setTestPrompt(e.target.value)}
            placeholder="Test sorusu..."
            className={inputClass}
          />
          <button onClick={handleTestModel} disabled={ftLoading}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40">
            {ftLoading ? `${SPINNER} Test ediliyor...` : 'Modeli Test Et'}
          </button>
          {testResult && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
              {testResult}
            </div>
          )}
        </div>

        {/* Mevcut Modeller */}
        {ftModels.length > 0 && (
          <div>
            <SectionTitle title="Mevcut Modeller" />
            <div className="space-y-2">
              {ftModels.map((m) => (
                <div key={m.name || m} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm">
                  <span className="font-mono text-gray-700 dark:text-gray-200">{m.name || m}</span>
                  <button
                    onClick={() => handleDeleteModel(m.name || m)}
                    disabled={ftLoading}
                    className="text-red-500 hover:text-red-700 text-xs disabled:opacity-40"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ step, title, desc, children }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{step}</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</span>
      </div>
      <p className="text-xs text-gray-400 mb-1">{desc}</p>
      {children}
    </div>
  );
}
