const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * File Upload Middleware - Configure multer for different file types
 */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const INVALID_MIME_MESSAGE = 'Desteklenmeyen dosya tipi. İzin verilenler: jpeg, png, pdf, excel, csv';

const MIME_WHITELIST = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
]);

const AVATAR_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

// Ensure upload directories exist
const uploadDirs = {
  avatars: path.join(__dirname, '../../uploads/avatars'),
  excel: path.join(__dirname, '../../uploads/excel')
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for avatars (disk storage)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.avatars);
  },
  filename: (req, file, cb) => {
    const originalName = String(file?.originalname || '');
    if (/\.\.|[\\/]/.test(originalName)) {
      return cb(new Error('Geçersiz dosya adı'), null);
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Uzantı kullanıcının dosya adından değil, doğrulanmış MIME türünden gelir
    const ext = AVATAR_EXTENSIONS[String(file.mimetype || '').toLowerCase()] || '.bin';
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + ext);
  }
});

// Configure storage for Excel (memory storage for direct processing)
const excelStorage = multer.memoryStorage();

const validateMimeWhitelist = (file) => MIME_WHITELIST.has(String(file?.mimetype || '').toLowerCase());
const hasPathTraversalChars = (filename) => /\.\.|[\\/]/.test(String(filename || ''));

const createMimeFilter = (allowedMimeSet, label) => (req, file, cb) => {
  const originalName = String(file?.originalname || '');
  const mimetype = String(file?.mimetype || '').toLowerCase();

  if (hasPathTraversalChars(originalName)) {
    return cb(new Error('Geçersiz dosya adı'), false);
  }

  if (!validateMimeWhitelist(file)) {
    return cb(new Error(INVALID_MIME_MESSAGE), false);
  }

  if (!allowedMimeSet.has(mimetype)) {
    return cb(new Error(INVALID_MIME_MESSAGE), false);
  }

  return cb(null, true);
};

const importMimeTypes = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  'text/csv'
]);

const avatarMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const importFileFilter = createMimeFilter(importMimeTypes, 'xlsx/csv');
const imageFileFilter = createMimeFilter(avatarMimeTypes, 'jpeg/png/webp');

const createUploader = ({ storage, fileFilter }) => multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

// Single source multer configuration exports
const uploadConfig = {
  import: createUploader({ storage: excelStorage, fileFilter: importFileFilter }),
  avatar: createUploader({ storage: avatarStorage, fileFilter: imageFileFilter })
};

// Dosya içeriği bildirilen görsel türüyle uyuşmalı (MIME başlığı istemciden gelir, güvenilmez)
const IMAGE_SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => b.slice(0, 4).toString('latin1') === 'GIF8',
  'image/webp': (b) => b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP'
};

const verifyImageSignature = (req, res, next) => {
  const file = req.file;
  if (!file) return next();
  let ok = false;
  try {
    const fd = fs.openSync(file.path, 'r');
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    fs.closeSync(fd);
    const check = IMAGE_SIGNATURES[String(file.mimetype || '').toLowerCase()];
    ok = Boolean(check && check(head));
  } catch {
    ok = false;
  }
  if (!ok) {
    try { fs.unlinkSync(file.path); } catch { /* dosya zaten yok */ }
    return res.status(400).json({ success: false, error: 'Dosya içeriği geçerli bir görsel değil' });
  }
  return next();
};

// Error handler middleware for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Dosya boyutu 10MB\'dan büyük olamaz',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Dosya yükleme hatası: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
  next();
};

module.exports = {
  uploadConfig,
  upload: uploadConfig.import,
  avatarUpload: uploadConfig.avatar,
  handleUploadError,
  verifyImageSignature,
};
