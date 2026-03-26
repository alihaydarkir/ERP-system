export default function LoadingState({ title = 'Yükleniyor...' }) {
  return (
    <div className="flex justify-center py-12" role="status" aria-live="polite" aria-label={title}>
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      </div>
    </div>
  );
}
