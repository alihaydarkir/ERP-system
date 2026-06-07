import ChatMessage from './ChatMessage';

export default function ChatMessagesPanel({ messages, loading, elapsed, timeoutSeconds, approvalState, messagesEndRef, onApprove, onReject, onFormSubmit, onFormCancel, onSelectionPick }) {
  const lastAiMessageId = [...messages].reverse().find((m) => m.type === 'ai')?.id;
  const lastFormMessageId = [...messages].reverse().find((m) => m.formTool)?.id;
  const lastSelectionMessageId = [...messages].reverse().find((m) => m.selectionRequired)?.id;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-y-auto p-4 space-y-4" style={{ maxHeight: '50vh' }}>
      {messages.map((message) => {
        const isLastAi = message.id === lastAiMessageId;
        const showApproval = isLastAi && approvalState?.requiresApproval;
        const isActiveForm = message.id === lastFormMessageId && message.formTool;
        const isActiveSelection = message.id === lastSelectionMessageId && message.selectionRequired;
        return (
          <ChatMessage
            key={message.id}
            message={message}
            showApprovalBadge={showApproval}
            onApprove={showApproval ? onApprove : undefined}
            onReject={showApproval ? onReject : undefined}
            approvalLoading={loading}
            onFormSubmit={isActiveForm ? onFormSubmit : undefined}
            onFormCancel={isActiveForm ? onFormCancel : undefined}
            onSelectionPick={isActiveSelection ? onSelectionPick : undefined}
          />
        );
      })}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Asistan yazıyor</span>
          <span className="inline-flex gap-1">
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${delay}s` }} />
            ))}
          </span>
          {elapsed > 0 && (
            <span className={`ml-1 tabular-nums ${elapsed >= timeoutSeconds - 5 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              {elapsed}s / {timeoutSeconds}s
            </span>
          )}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
