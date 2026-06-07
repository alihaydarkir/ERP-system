export default function ChatSelectionList({ selection, onSelect, loading }) {
  if (!selection?.items?.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">Seçim yapın:</p>
      <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
        {selection.items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={loading}
            onClick={() => onSelect(item, selection)}
            className="text-left text-xs px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
