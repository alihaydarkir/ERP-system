const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getHistory } = require('../controllers/chatController');

// Eski belge arama (RAG) sohbet uçları kapatıldı: ekrandaki hiçbir sayfa kullanmıyordu ve
// `rag_knowledge` tablosunda şirket (company_id) ayrımı yoktu; ileride şirket belgesi yüklense
// tüm şirketlere açık olurdu. Yapay zekâ sohbeti yalnızca `/api/ai/chat` üzerinden yapılır
// (şirket, rol ve izin kontrolleriyle). Tekrar açmak için önce bilgi tabanı şirkete bağlanmalı.
const removed = (_req, res) => res.status(410).json({
  success: false,
  code: 'ENDPOINT_REMOVED',
  message: 'Bu uç kaldırıldı. Yapay zekâ sohbeti için /api/ai/chat kullanılır.'
});

// Kimlik doğrulaması önce çalışır: oturumsuz istek 401, oturumlu istek 410 alır
router.post('/message', authMiddleware, removed);
router.post('/rag', authMiddleware, removed);
router.get('/history', authMiddleware, getHistory);

module.exports = router;
