export default function EmptyState({ message = 'Kayıt bulunamadı.' }) {
  return (
    <div className="text-center py-12" role="status" aria-live="polite">
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
