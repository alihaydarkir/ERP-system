// Yönetici onayı isteyen AI işlemlerinin kullanıcıya gösterilen Türkçe metinleri.
const TOOL_LABELS = {
  cancel_order: 'Sipariş iptali',
  set_cheque_status: 'Çek durum değişikliği',
  deactivate_product: 'Ürünü pasife alma'
};

const approvalToolLabel = (tool) => TOOL_LABELS[tool] || 'Bu işlem';

const approvalRequestedMessage = (tool, summary) => {
  const detail = summary ? `: ${String(summary).replace(/\.$/, '')}` : '';
  return `⏳ ${approvalToolLabel(tool)} yönetici onayı bekliyor${detail}. Onayla veya Reddet düğmesini kullanabilirsiniz.`;
};

module.exports = { approvalToolLabel, approvalRequestedMessage };
