const TOOL_ICONS = {
  get_dashboard_summary: '📊',
  search_cheques: '📋',
  get_overdue_cheques: '⚠️',
  get_financial_summary: '💰',
  get_low_stock_products: '📦',
  search_products: '🔍',
  search_customers: '👥',
  get_orders_summary: '🛒',
  set_product_stock: '📦',
  deactivate_product: '🛑',
  cancel_order: '🚫',
  set_cheque_status: '💳',
  create_customer: '👤',
  update_customer: '📝',
  create_product: '🆕',
  update_product: '✏️',
  create_supplier: '🏭',
  update_supplier: '🧾',
  create_warehouse: '🏬',
  update_warehouse: '📍',
  create_cheque: '🧷',
  set_order_status: '📌',
  set_invoice_status: '🧾',
  default: '🔧'
};

const TOOL_RISK = {
  set_product_stock: 'low',
  update_customer: 'low',
  update_product: 'low',
  set_order_status: 'low',
  set_invoice_status: 'low',
  create_customer: 'medium',
  create_product: 'medium',
  create_supplier: 'medium',
  create_warehouse: 'medium',
  create_cheque: 'medium',
  deactivate_product: 'high',
  cancel_order: 'high',
  set_cheque_status: 'high'
};

const RISK_CLASSES = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
};

function JsonBox({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <pre className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export default function ChatToolCallDisplay({ card }) {
  const toolName = card?.tool || 'unknown_tool';
  const icon = TOOL_ICONS[toolName] || TOOL_ICONS.default;
  const risk = TOOL_RISK[toolName] || 'low';

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-900/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <span>{icon}</span>
          <span>{toolName}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_CLASSES[risk]}`}>
          risk: {risk}
        </span>
      </div>

      <JsonBox label="Parametreler" value={card?.params} />
      <JsonBox label="Sonuç" value={card?.result} />
    </div>
  );
}
