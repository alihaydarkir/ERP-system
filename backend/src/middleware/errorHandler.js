const { randomUUID } = require('crypto');
const { logger } = require('./logger');

const VALIDATION_CODES = new Set(['VALIDATION_ERROR', 'BAD_REQUEST', 'INVALID_INPUT']);
const NOT_FOUND_CODES = new Set(['NOT_FOUND']);

const isValidationError = (err = {}) => {
  return (
    err.status === 400 ||
    err.status === 422 ||
    VALIDATION_CODES.has(err.code) ||
    err.name === 'ValidationError' ||
    err.name === 'SyntaxError' ||
    Boolean(err.isJoi)
  );
};

const isNotFoundError = (err = {}) => {
  return (
    err.status === 404 ||
    NOT_FOUND_CODES.has(err.code)
  );
};

const resolveErrorMeta = (err = {}) => {
  if (isValidationError(err)) {
    return {
      status: err.status && err.status >= 400 && err.status < 500 ? err.status : 400,
      type: 'validation_error',
      safeMessage: 'Geçersiz istek.',
    };
  }

  if (isNotFoundError(err)) {
    return {
      status: 404,
      type: 'not_found',
      safeMessage: 'Kaynak bulunamadı.',
    };
  }

  return {
    status: err.status && err.status >= 400 ? err.status : 500,
    type: 'system_error',
    safeMessage: 'Beklenmeyen bir hata oluştu.',
  };
};

const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requestId = req.requestId || req.headers['x-request-id'] || randomUUID();
  const { status, type, safeMessage } = resolveErrorMeta(err || {});

  logger.error('Unhandled application error', {
    requestId,
    path: req.originalUrl,
    method: req.method,
    status,
    type,
    errorMessage: err?.message,
    errorCode: err?.code,
    stack: err?.stack,
  });

  const responseMessage = isDevelopment
    ? (err?.message || safeMessage)
    : safeMessage;

  return res.status(status).json({
    error: responseMessage,
    type,
    requestId,
    ...(isDevelopment && err?.stack ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;

