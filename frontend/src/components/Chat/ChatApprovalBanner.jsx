export default function ChatApprovalBanner({ pendingConfirmation, loading, onApprove, onReject }) {
  if (!pendingConfirmation) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Onay Bekleyen İşlem</h3>
          <p className="text-sm text-amber-700 dark:text-amber-200 mt-1 whitespace-pre-wrap">{pendingConfirmation.preview}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50"
            >
              Reddet
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Onayla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
