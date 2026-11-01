// AI yönetici onayı mesajlarında ham araç adı (cancel_order) yerine Türkçe ad göster.
const TOOL_LABELS = {
  cancel_order: 'Sipariş iptali',
  set_cheque_status: 'Çek durum değişikliği',
  deactivate_product: 'Ürünü pasife alma'
};

export const approvalToolLabel = (tool) => TOOL_LABELS[tool] || 'İşlem';

export const approvalResultText = (status, tool, errorText) => {
  const label = approvalToolLabel(tool);
  if (status === 'approved' || status === 'executed') return `✅ ${label} onaylandı ve tamamlandı.`;
  if (status === 'failed') return `❌ ${label} yürütülemedi: ${errorText || 'Bilinmeyen hata'}`;
  return `❌ ${label} reddedildi, kayıtlarda değişiklik yapılmadı.`;
};
