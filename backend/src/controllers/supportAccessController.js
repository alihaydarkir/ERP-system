const supportAccess = require('../services/supportAccessService');
const diagnostics = require('../services/diagnosticsService');
const aiService = require('../services/aiService');
const AuditLog = require('../models/AuditLog');
const pool = require('../config/database');
const { redisClient: getRedisClient, isRedisConnected } = require('../config/redis');
const { formatSuccess, formatError } = require('../utils/formatters');
const { getClientIP } = require('../utils/helpers');

const handleError = (res, error, fallback) => {
  if (error.status) {
    return res.status(error.status).json(formatError(error.message));
  }
  console.error(fallback, error);
  return res.status(500).json(formatError(fallback));
};

// GET /api/support/grants — şirketin izinleri (aktif + geçmiş)
const listGrants = async (req, res) => {
  try {
    const grants = await supportAccess.listGrants(req.user.company_id);
    res.json(formatSuccess({
      grants,
      active: grants.find((g) => g.is_active) || null,
      options: { duration_hours: supportAccess.DURATION_HOURS, access_levels: supportAccess.ACCESS_LEVELS }
    }));
  } catch (error) {
    handleError(res, error, 'Destek izinleri alınamadı');
  }
};

// POST /api/support/grants — yeni izin; erişim kodu yalnızca bu yanıtta döner
const createGrant = async (req, res) => {
  try {
    const { duration_hours, reason, access_level } = req.body || {};
    const { grant, code } = await supportAccess.createGrant({
      companyId: req.user.company_id,
      grantedBy: req.user.id,
      durationHours: duration_hours,
      reason,
      accessLevel: access_level || 'read'
    });
    res.status(201).json(formatSuccess({ grant, code }, 'Destek erişimi açıldı'));
  } catch (error) {
    handleError(res, error, 'Destek erişimi açılamadı');
  }
};

// POST /api/support/grants/:id/revoke — açık destek oturumu anında kapanır
const revokeGrant = async (req, res) => {
  try {
    const grant = await supportAccess.revokeGrant({
      grantId: Number(req.params.id),
      companyId: req.user.company_id,
      revokedBy: req.user.id
    });
    if (!grant) {
      return res.status(404).json(formatError('Aktif izin bulunamadı'));
    }
    res.json(formatSuccess({ grant }, 'Destek erişimi iptal edildi'));
  } catch (error) {
    handleError(res, error, 'Destek erişimi iptal edilemedi');
  }
};

// GET /api/support/grants/:id/activity — destek oturumunun yaptığı her istek
const getGrantActivity = async (req, res) => {
  try {
    const grantId = Number(req.params.id);
    const grant = await supportAccess.getGrant(grantId, req.user.company_id);
    if (!grant) {
      return res.status(404).json(formatError('İzin bulunamadı'));
    }
    const activity = await supportAccess.listGrantActivity(grantId, req.user.company_id);
    res.json(formatSuccess({ grant, activity }));
  } catch (error) {
    handleError(res, error, 'Destek işlem kaydı alınamadı');
  }
};

// GET /api/support/diagnostics — müşteri kaydı içermeyen tanı paketi (JSON dosyası olarak iner)
const downloadDiagnostics = async (req, res) => {
  try {
    const bundle = await diagnostics.buildBundle({
      pool,
      checkAi: () => aiService.checkHealth(),
      getRedisStatus: async () => {
        const client = getRedisClient();
        if (!client || !isRedisConnected()) return 'unavailable';
        await client.ping();
        return 'ok';
      },
      company: { id: req.user.company_id }
    });

    await AuditLog.create({
      user_id: req.user.id,
      action: 'DIAGNOSTICS_DOWNLOAD',
      entity_type: 'diagnostics',
      entity_id: null,
      company_id: req.user.company_id,
      ip_address: getClientIP(req),
      changes: { recent_errors: bundle.recent_errors.length }
    });

    const stamp = bundle.generated_at.slice(0, 16).replace(/[-:T]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="helix-tani-${stamp}.json"`);
    res.json(bundle);
  } catch (error) {
    handleError(res, error, 'Tanı paketi oluşturulamadı');
  }
};

module.exports = {
  listGrants,
  createGrant,
  revokeGrant,
  getGrantActivity,
  downloadDiagnostics
};
