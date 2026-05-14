export default function ChatQuickQuestions({ questions, onSelect, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q.text)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{q.icon}</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{q.label}</span>
        </button>
      ))}
    </div>
  );
}
