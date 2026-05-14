import ChatToolCallDisplay from './ChatToolCallDisplay';

const TOOL_CALL_BLOCK_REGEX = /```tool_call\s*([\s\S]*?)```/gi;

const tryParseToolCallJson = (rawBlock) => {
  try {
    return JSON.parse(String(rawBlock || '').trim());
  } catch {
    return null;
  }
};

const extractToolCardsFromText = (text) => {
  if (!text || typeof text !== 'string') return { cleanText: text || '', toolCards: [] };

  const toolCards = [];
  const cleanText = text.replace(TOOL_CALL_BLOCK_REGEX, (_, block) => {
    const parsed = tryParseToolCallJson(block);
    if (parsed) {
      toolCards.push({
        tool: parsed.tool || parsed.tool_name || parsed.name || parsed?.call?.tool || 'unknown_tool',
        params: parsed.params || parsed.parameters || parsed.args || parsed.input || {},
        result: parsed.result || parsed.output || parsed.response || parsed.data || null,
      });
    }
    return '';
  }).trim();

  return { cleanText, toolCards };
};

function ToolStep({ step }) {
  if (step.type === 'tool_call') return <div className="text-xs text-blue-600">🔧 Araç çalışıyor...</div>;
  if (step.type === 'tool_result') return <div className="text-xs text-green-600">✅ Araç sonucu alındı</div>;
  if (step.type === 'tool_error') return <div className="text-xs text-red-600">❌ {step.error || 'Araç hatası'}</div>;
  return null;
}

export default function ChatMessage({ message, showApprovalBadge = false }) {
  const isUser = message.type === 'user';
  const isThinking = message.type === 'thinking';
  const { cleanText, toolCards } = extractToolCardsFromText(message.text || '');

  if (isThinking) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">🤖 AI düşünüyor...</div>
          <div className="space-y-1">{(message.steps || []).map((s, i) => <ToolStep key={i} step={s} />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span>🤖</span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ERP Asistanı</span>
            {showApprovalBadge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Onay Bekleniyor
              </span>
            )}
          </div>
        )}

        {!isUser && toolCards.length > 0 && (
          <div className="space-y-2 mb-2">
            {toolCards.map((card, i) => <ChatToolCallDisplay key={`${card.tool}-${i}`} card={card} />)}
          </div>
        )}

        {cleanText && <p className="whitespace-pre-wrap text-sm leading-relaxed">{cleanText}</p>}
        <p className={`text-xs mt-1.5 ${isUser ? 'text-blue-100' : 'text-gray-400 dark:text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
