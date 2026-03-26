export default function PageLoader({ text = 'Sayfa yükleniyor...' }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-sm font-medium">{text}</p>
      </div>
    </div>
  );
}
