const Joi = require('joi');

// 6 haneli TOTP ya da yedek kod (XXXXX-XXXXX; tire/boşluk serbest)
const loginCode = Joi.string().trim().min(6).max(16).pattern(/^[A-Za-z0-9 -]+$/);

const twoFaSchemas = {
  // Kurulumu tamamla: yalnızca 6 haneli TOTP
  verify: Joi.object({
    token: Joi.string().pattern(/^\d{6}$/).required(),
  }),

  // 2FA'yı kapat: parola + güncel kod (TOTP ya da yedek kod)
  disable: Joi.object({
    password: Joi.string().max(200).required(),
    code: loginCode.required(),
  }),

  // Yedek kodları yeniden üret: güncel TOTP
  regenerate: Joi.object({
    token: Joi.string().pattern(/^\d{6}$/).required(),
  }),

  // Girişte ikinci adım: tempToken + kod
  loginVerify: Joi.object({
    tempToken: Joi.string().max(2000).required(),
    code: loginCode.required(),
  }),
};

module.exports = {
  twoFaSchemas,
};
