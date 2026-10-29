// Süreli destek erişimi: müşteri yöneticisi Helix-Ware desteğine 1/4/24 saatlik izin verir.
// - Erişim kodu ekranda bir kez gösterilir, DB'de yalnızca sha256 hash'i durur.
// - Destek kullanıcısı (role='support') şirket başına tektir; şifresi rastgele, normal girişle kullanılamaz.
// - İzin iptal edilince ya da süresi dolunca destek oturumları anında kapanır (auth middleware her istekte kontrol eder).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const DURATION_HOURS = [1, 4, 24];
const ACCESS_LEVELS = ['read', 'edit'];
// Karıştırılabilen karakterler yok (0/O, 1/I/L): kod telefonda okunabilsin
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const hashCode = (code) =>
  crypto.createHash('sha256').update(String(code || '').replace(/[\s-]/g, '').toUpperCase()).digest('hex');

// 12 karakter (~59 bit), 4'lü gruplar: "ABCD-EFGH-JKMN"
const generateCode = () => {
  const bytes = crypto.randomBytes(12);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return chars.match(/.{4}/g).join('-');
};

const supportEmailFor = (companyId) => `destek+${companyId}@helix-ware.local`;

const ensureSupportUser = async (client, companyId) => {
  const email = supportEmailFor(companyId);
  const existing = await client.query('SELECT id FROM users WHERE email = $1 AND role = $2', [email, 'support']);
  if (existing.rows[0]) return existing.rows[0].id;

  // Şifre kimseye gösterilmez: destek yalnızca erişim koduyla girer
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const created = await client.query(
    `INSERT INTO users (username, email, password_hash, role, full_name, company_id, is_active,
                        approval_status, email_verified, onboarding_completed)
     VALUES ($1, $2, $3, 'support', 'Helix-Ware Destek', $4, true, 'approved', true, true)
     RETURNING id`,
    [`helixware_destek_${companyId}`, email, passwordHash, companyId]
  );
  return created.rows[0].id;
};

const closeSupportSessions = (client, supportUserId) =>
  client.query(
    'UPDATE user_sessions SET is_active = false, last_activity = NOW() WHERE user_id = $1 AND is_active = true',
    [supportUserId]
  );

const publicGrant = (row) => {
  if (!row) return null;
  const { code_hash, ...rest } = row; // eslint-disable-line no-unused-vars
  return rest;
};

const GRANT_COLUMNS = `
  g.id, g.company_id, g.support_user_id, g.granted_by, g.reason, g.access_level, g.expires_at,
  g.revoked_at, g.revoked_by, g.first_used_at, g.created_at,
  (g.revoked_at IS NULL AND g.expires_at > NOW()) AS is_active,
  GREATEST(0, EXTRACT(EPOCH FROM (g.expires_at - NOW())))::int AS remaining_seconds,
  gu.username AS granted_by_name`;

/**
 * Yeni izin oluşturur. Şirketin önceki aktif izni iptal edilir (aynı anda tek izin).
 * Dönen `code` yalnızca bu yanıtta vardır.
 */
const createGrant = async ({ companyId, grantedBy, durationHours, reason, accessLevel = 'read' }) => {
  if (!DURATION_HOURS.includes(Number(durationHours))) {
    throw Object.assign(new Error('Süre 1, 4 veya 24 saat olmalı'), { status: 400 });
  }
  if (!ACCESS_LEVELS.includes(accessLevel)) {
    throw Object.assign(new Error('Yetki seviyesi read veya edit olmalı'), { status: 400 });
  }
  const trimmedReason = String(reason || '').trim();
  if (trimmedReason.length < 3 || trimmedReason.length > 500) {
    throw Object.assign(new Error('Neden 3-500 karakter olmalı'), { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const supportUserId = await ensureSupportUser(client, companyId);

    await client.query(
      `UPDATE support_access_grants SET revoked_at = NOW(), revoked_by = $2
       WHERE company_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [companyId, grantedBy]
    );
    await closeSupportSessions(client, supportUserId);

    const code = generateCode();
    const inserted = await client.query(
      `INSERT INTO support_access_grants
         (company_id, support_user_id, granted_by, reason, access_level, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(hours => $7))
       RETURNING id`,
      [companyId, supportUserId, grantedBy, trimmedReason, accessLevel, hashCode(code), Number(durationHours)]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, company_id)
       VALUES ($1, 'support_access_granted', 'support_access', $2, $3, $4)`,
      [grantedBy, inserted.rows[0].id, JSON.stringify({ duration_hours: Number(durationHours), access_level: accessLevel, reason: trimmedReason }), companyId]
    );
    await client.query('COMMIT');

    const grant = await getGrant(inserted.rows[0].id, companyId);
    return { grant, code };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getGrant = async (grantId, companyId) => {
  const result = await pool.query(
    `SELECT ${GRANT_COLUMNS}
     FROM support_access_grants g LEFT JOIN users gu ON gu.id = g.granted_by
     WHERE g.id = $1 AND g.company_id = $2`,
    [grantId, companyId]
  );
  return result.rows[0] || null;
};

const listGrants = async (companyId, limit = 20) => {
  const result = await pool.query(
    `SELECT ${GRANT_COLUMNS},
            (SELECT COUNT(*)::int FROM audit_logs a WHERE a.support_grant_id = g.id) AS request_count
     FROM support_access_grants g LEFT JOIN users gu ON gu.id = g.granted_by
     WHERE g.company_id = $1
     ORDER BY g.created_at DESC
     LIMIT $2`,
    [companyId, limit]
  );
  return result.rows;
};

const revokeGrant = async ({ grantId, companyId, revokedBy }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE support_access_grants SET revoked_at = NOW(), revoked_by = $3
       WHERE id = $1 AND company_id = $2 AND revoked_at IS NULL
       RETURNING support_user_id`,
      [grantId, companyId, revokedBy]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    await closeSupportSessions(client, result.rows[0].support_user_id);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, company_id)
       VALUES ($1, 'support_access_revoked', 'support_access', $2, '{}', $3)`,
      [revokedBy, grantId, companyId]
    );
    await client.query('COMMIT');
    return getGrant(grantId, companyId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/** Koda karşılık gelen aktif izni ve destek kullanıcısını döner; yoksa null. */
const findActiveGrantByCode = async (code) => {
  const result = await pool.query(
    `SELECT g.*, u.username, u.email, u.role, u.company_id AS user_company_id
     FROM support_access_grants g JOIN users u ON u.id = g.support_user_id
     WHERE g.code_hash = $1 AND g.revoked_at IS NULL AND g.expires_at > NOW()
       AND u.role = 'support' AND u.is_active = true AND u.deleted_at IS NULL`,
    [hashCode(code)]
  );
  return result.rows[0] || null;
};

/** Her destek isteğinde çağrılır: izin hâlâ geçerli mi? */
const getActiveGrantForRequest = async (grantId, supportUserId, companyId) => {
  const result = await pool.query(
    `SELECT id, access_level, expires_at
     FROM support_access_grants
     WHERE id = $1 AND support_user_id = $2 AND company_id = $3
       AND revoked_at IS NULL AND expires_at > NOW()`,
    [grantId, supportUserId, companyId]
  );
  return result.rows[0] || null;
};

const markGrantUsed = (grantId) =>
  pool.query('UPDATE support_access_grants SET first_used_at = COALESCE(first_used_at, NOW()) WHERE id = $1', [grantId]);

const logSupportRequest = ({ grantId, userId, companyId, method, path, status, ip }) =>
  pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, changes, ip_address, company_id, is_support, support_grant_id)
     VALUES ($1, 'support_request', 'support_access', $2, $3, $4, true, $5)`,
    [userId, JSON.stringify({ method, path, status }), ip || null, companyId, grantId]
  );

const listGrantActivity = async (grantId, companyId, limit = 200) => {
  const result = await pool.query(
    `SELECT a.id, a.action, a.changes, a.ip_address, a.created_at
     FROM audit_logs a
     JOIN support_access_grants g ON g.id = a.support_grant_id
     WHERE a.support_grant_id = $1 AND g.company_id = $2
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [grantId, companyId, limit]
  );
  return result.rows;
};

// Destek oturumunun hiçbir zaman yapamayacağı işlemler (yetki seviyesinden bağımsız):
// kendi iznini uzatma, tanı paketi indirme (müşteri kendisi gönderir), yedek şifrelemesi,
// kullanıcı/rol/şifre/2FA yönetimi. (/api/settings bilinçli olarak yasak değil: SMTP hedefi değişimi denetleyicide parola yeniden girişini zorunlu kılar.)
// Not: Express yönlendirmesi büyük/küçük harfe duyarsızdır; deny-list de /i olmalı (/API/USER-MANAGEMENT atlatması).
// Denetim kayıtları (parola sızıntısı riski) okuma dahil kapalı; aktivite günlüğü/kendi veri silme yazma kapalı.
const SUPPORT_SELF_PATHS = /^\/api\/(support\/(grants|diagnostics)|backups|admin\/audit-logs)/i;
const SUPPORT_FORBIDDEN_PATHS = [
  SUPPORT_SELF_PATHS,
  /^\/api\/user-management/i,
  /^\/api\/permissions/i,
  /^\/api\/admin\/users/i,
  /^\/api\/employee-approval/i,
  /^\/api\/security/i,
  /^\/api\/activity-logs/i,
  /^\/api\/users\/me/i,
  /^\/api\/users\/(password|profile\/password|profile\/2fa)/i,
  /^\/api\/auth\/(register|forgot-password|reset-password)/i,
];

// Dışa aktarma (PDF/Excel) hiçbir yetki seviyesinde yok: destek ekranda bakar, veriyi dosya olarak çıkaramaz.
const EXPORT_PATH = /\/export(\/|$)|\/(pdf|excel)(\/|$)/i;

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];
// Salt okunur izinde bile izin verilen yazma istekleri (oturumun kendisi)
const SESSION_PATHS = [/^\/api\/auth\/logout$/i, /^\/api\/auth\/refresh$/i];

/**
 * Destek isteğinin reddedilme nedeni; izinliyse null.
 * @returns {null | { status: number, message: string }}
 */
const getSupportDenial = ({ method, path, accessLevel }) => {
  if (EXPORT_PATH.test(path)) {
    return { status: 403, message: 'Destek oturumunda dışa aktarma yapılamaz.' };
  }
  const isRead = READ_METHODS.includes(method);
  if (SUPPORT_FORBIDDEN_PATHS.some((re) => re.test(path)) && !(isRead && !SUPPORT_SELF_PATHS.test(path))) {
    return { status: 403, message: 'Bu işlem destek oturumunda yapılamaz.' };
  }
  if (accessLevel !== 'edit' && !isRead && !SESSION_PATHS.some((re) => re.test(path))) {
    return { status: 403, message: 'Destek erişimi salt okunur: değişiklik yapılamaz.' };
  }
  return null;
};

module.exports = {
  DURATION_HOURS,
  ACCESS_LEVELS,
  hashCode,
  generateCode,
  publicGrant,
  createGrant,
  getGrant,
  listGrants,
  revokeGrant,
  findActiveGrantByCode,
  getActiveGrantForRequest,
  markGrantUsed,
  logSupportRequest,
  listGrantActivity,
  getSupportDenial,
};
