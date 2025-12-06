const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * File Upload Middleware - Configure multer for different file types
 */

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for Excel (memory storage for direct processing)
const excelStorage = multer.memoryStorage();

// File filter - Only allow Excel files
const excelFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ];

  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece Excel dosyaları (.xlsx, .xls) yüklenebilir'), false);
  }
};

// File filter - Only allow image files
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları (.jpg, .jpeg, .png) yüklenebilir'), false);
  }
};

// Configure multer for Excel uploads
const upload = multer({
  storage: excelStorage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
});

// Configure multer for avatar uploads
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
});

// Error handler middleware for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Dosya boyutu 5MB\'dan büyük olamaz',
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
  upload,
  avatarUpload,
  handleUploadError,
};
