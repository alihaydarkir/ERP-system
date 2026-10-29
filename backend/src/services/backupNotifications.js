// Yedek güvenlik olayları için bildirim: şirket yöneticilerine (anlık + e-posta) ve
// HELIX_BILDIRIM_EPOSTA tanımlıysa Helix-Ware'e. Bize giden e-posta YALNIZ olay bilgisidir:
// firma adı, olay, zaman. Anahtar, parola, kurtarma kodu ya da veri asla eklenmez.
// E-posta müşterinin kendi SMTP'siyle gider (Ayarlar → E-posta; yoksa .env SMTP).
const nodemailer = require('nodemailer');
const pool = require('../config/database');
const Settings = require('../models/Settings');
const emailService = require('./emailService');
const notifier = require('../websocket/notifier');

const ACTION_TEXT = {
  BACKUP_ENCRYPTION_SETUP: 'Yedek şifrelemesi kuruldu',
  BACKUP_PASSWORD_CHANGED: 'Yedek parolası değiştirildi',
  BACKUP_RECOVERY_USED: 'Kurtarma koduyla yeni yedek parolası belirlendi',
  BACKUP_RECOVERY_ROTATED: 'Yeni kurtarma kodu üretildi (eski kod geçersiz)',
};

const companySmtp = async (companyId) => {
  const get = async (key) => (await Settings.findByKey(key, companyId, { reveal: true }))?.value || '';
  const host = await get('emailSmtpHost');
  if (!host) return null;
  const port = Number(await get('emailSmtpPort')) || 587;
  const user = await get('emailSmtpUsername');
  const pass = await get('emailSmtpPassword');
  return {
    from: await get('emailFromAddress'),
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      requireTLS: !!(user && pass) && port !== 465,
    }),
  };
};

const sendMail = async (smtp, to, subject, html) => {
  if (smtp) {
    await smtp.transporter.sendMail({ from: smtp.from || undefined, to, subject, html });
  } else {
    await emailService.sendEmail(to, subject, html);
  }
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Bildirim hatası asıl işlemi bozmaz: işlem zaten yapıldı, yalnız loglanır
const notify = async ({ companyId, actor, action }) => {
  const text = ACTION_TEXT[action] || action;
  const when = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  try {
    notifier.notifyBackupEvent({ companyId, action, message: `${text} (${actor.username})`, actorUserId: actor.id });
  } catch (error) {
    console.error('Yedek bildirimi (anlık) gönderilemedi:', error.message);
  }

  try {
    const [admins, company] = await Promise.all([
      pool.query(
        "SELECT email FROM users WHERE company_id = $1 AND role = 'admin' AND is_active = true AND email IS NOT NULL",
        [companyId]
      ),
      pool.query('SELECT company_name FROM companies WHERE id = $1', [companyId]),
    ]);
    const companyName = company.rows[0]?.company_name || `Şirket #${companyId}`;
    const smtp = await companySmtp(companyId);

    const adminHtml =
      `<p><strong>${escapeHtml(text)}</strong></p>` +
      `<p>Yapan: ${escapeHtml(actor.username)} · ${escapeHtml(when)}</p>` +
      '<p>Bu işlemi siz ya da ekibiniz yapmadıysa hemen yedek parolasını değiştirin ve yeni kurtarma kodu üretin.</p>';
    for (const { email } of admins.rows) {
      await sendMail(smtp, email, `Helix-Ware ERP — ${text}`, adminHtml);
    }

    const helixAddress = String(process.env.HELIX_BILDIRIM_EPOSTA || '').trim();
    if (helixAddress) {
      await sendMail(
        smtp,
        helixAddress,
        `[${companyName}] ${text}`,
        `<p>${escapeHtml(companyName)}: ${escapeHtml(text)} — ${escapeHtml(when)}</p>`
      );
    }
  } catch (error) {
    console.error('Yedek bildirimi (e-posta) gönderilemedi:', error.message);
  }
};

module.exports = { ACTION_TEXT, notify };
