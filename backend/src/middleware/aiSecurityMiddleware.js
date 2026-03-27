class SecurityError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'SecurityError';
    this.code = 'AI_SECURITY_VIOLATION';
    this.details = details;
  }
}

const DANGEROUS_INPUT_PATTERNS = [
  /ignore\s+instructions?/i,
  /jailbreak/i,
  /system\s+prompt/i,
  /you\s+are\s+now/i,
  /<\|[^|>]+\|>/i,
  /\]\]>/
];

const SENSITIVE_KEYS = new Set([
  'password',
  'tax_number',
  'iban',
  'credit_card',
  'phone',
  'email',
  'address',
  'secret',
  'token'
]);

const OUTPUT_BLOCK_PATTERNS = [
  /company_id\s*[:=]\s*\d+/i,
  /\bpassword\b/i,
  /\bsecret\b/i,
  /select\s+.*\s+from/i,
  /drop\s+table/i
];

const sanitizeUserInput = (input) => {
  const normalized = String(input ?? '').trim();

  if (normalized.length > 2000) {
    throw new SecurityError('Input karakter limiti aşıldı (maksimum 2000)');
  }

  for (const pattern of DANGEROUS_INPUT_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new SecurityError('Tehlikeli input pattern tespit edildi', { pattern: pattern.toString() });
    }
  }

  return normalized;
};

const maskPII = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => maskPII(item));
  }

  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
        out[key] = '***';
      } else {
        out[key] = maskPII(value);
      }
    }
    return out;
  }

  return obj;
};

const wrapExternalData = (data) => {
  const safe = typeof data === 'string' ? data : JSON.stringify(maskPII(data), null, 2);
  return `[SYSTEM_DATA_START]\n${safe}\n[SYSTEM_DATA_END]`;
};

const filterAIOutput = (response) => {
  const text = String(response ?? '');

  for (const pattern of OUTPUT_BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      return 'Bu bilgiyi paylaşamıyorum.';
    }
  }

  return response;
};

const validateAIRequest = (req, res, next) => {
  try {
    if (typeof req.body?.message === 'string') {
      req.body.message = sanitizeUserInput(req.body.message);
    }
    return next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Geçersiz AI isteği',
      code: error.code || 'VALIDATION_ERROR'
    });
  }
};

module.exports = {
  SecurityError,
  sanitizeUserInput,
  maskPII,
  wrapExternalData,
  filterAIOutput,
  validateAIRequest
};
