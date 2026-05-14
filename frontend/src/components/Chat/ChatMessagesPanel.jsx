import ChatMessage from './ChatMessage';

export default function ChatMessagesPanel({ messages, loading, approvalState, messagesEndRef }) {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-y-auto p-4 space-y-4" style={{ maxHeight: '50vh' }}>
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          showApprovalBadge={message.type === 'ai' ? approvalState?.requiresApproval : false}
        />
      ))}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Asistan yazıyor</span>
          <span className="inline-flex gap-1">
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${delay}s` }} />
            ))}
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
