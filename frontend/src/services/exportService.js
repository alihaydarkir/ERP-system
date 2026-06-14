import api from './api';

/** Blob'u dosya olarak indirir */
function triggerDownload(blobData, filename) {
  const url = URL.createObjectURL(new Blob([blobData]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Ortak tablo PDF'i — backend /api/export/pdf üzerinden üretilir (Türkçe + lacivert stil).
 * payload: { companyName, documentTitle, meta, columns, rows, currencyColumns, rowStyles, footer, orientation, filename }
 */
export async function downloadTablePdf(payload) {
  const res = await api.post('/api/export/pdf', payload, { responseType: 'blob' });
  triggerDownload(res.data, `${payload.filename || payload.documentTitle || 'rapor'}.pdf`);
}

/** Ortak tablo Excel'i — backend /api/export/excel üzerinden üretilir */
export async function downloadTableExcel(payload) {
  const res = await api.post('/api/export/excel', payload, { responseType: 'blob' });
  triggerDownload(res.data, `${payload.filename || payload.documentTitle || 'rapor'}.xlsx`);
}
