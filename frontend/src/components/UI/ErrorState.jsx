export default function ErrorState({
  title = 'Bir hata oluştu',
  message = 'Veriler yüklenirken bir sorun oluştu.',
  onRetry,
  retryText = 'Tekrar Dene'
}) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4" role="alert">
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">{title}</h3>
      <p className="text-sm text-red-600 dark:text-red-200 mt-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}
