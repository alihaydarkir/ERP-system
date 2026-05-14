export default function ChatErrorBanner({ chatError, onRetry, canRetry, loading }) {
  if (!chatError) return null;

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-sm text-red-700 dark:text-red-300">
        <span className="font-semibold mr-1">Hata:</span>
        {chatError}
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading || !canRetry}
        className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Tekrar dene
      </button>
    </div>
  );
}
