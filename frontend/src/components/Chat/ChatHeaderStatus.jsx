export default function ChatHeaderStatus({ aiStatus, approvalState }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 ERP AI Asistanı</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">ERP verilerinizi anlayıp analiz eden akıllı asistan</p>
      </div>

      <div className="flex items-center gap-2">
        {approvalState?.requiresApproval && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Onay Bekleniyor
          </span>
        )}

        {approvalState && !approvalState.requiresApproval && approvalState.status === 'approved' && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
            ✅ Onaylandı
          </span>
        )}

        {approvalState && !approvalState.requiresApproval && approvalState.status === 'rejected' && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
            ❌ Reddedildi
          </span>
        )}

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          aiStatus.available === null ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
          : aiStatus.available ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            aiStatus.available === null ? 'bg-gray-400 animate-pulse'
            : aiStatus.available ? 'bg-green-50 dark:bg-green-900/200'
            : 'bg-red-50 dark:bg-red-900/200'
          }`} />
          {aiStatus.available === null ? 'Kontrol ediliyor...'
            : aiStatus.available ? `Çevrimiçi · ${aiStatus.model}`
            : 'Ollama Çevrimdışı'}
        </div>
      </div>
    </div>
  );
}
