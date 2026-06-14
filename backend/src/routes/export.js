const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { exportPdf, exportExcel } = require('../controllers/exportController');

// Genel tablo export'u — frontend kolon+satırları gönderir, backend ortak stille üretir.
// Kullanıcı zaten gördüğü veriyi export ettiği için ekstra izin gerektirmez (auth yeterli).
router.post('/pdf', authMiddleware, exportPdf);
router.post('/excel', authMiddleware, exportExcel);

module.exports = router;
