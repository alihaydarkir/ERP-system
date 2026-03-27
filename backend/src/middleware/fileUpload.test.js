jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

jest.mock('multer', () => {
  const multer = jest.fn((options) => {
    const uploader = {
      _options: options,
      single: jest.fn(() => (req, res, next) => next()),
      array: jest.fn(() => (req, res, next) => next()),
    };
    return uploader;
  });

  multer.diskStorage = jest.fn((opts) => ({ type: 'diskStorage', ...opts }));
  multer.memoryStorage = jest.fn(() => ({ type: 'memoryStorage' }));

  class MulterError extends Error {
    constructor(code, message) {
      super(message || code);
      this.name = 'MulterError';
      this.code = code;
    }
  }

  multer.MulterError = MulterError;
  return multer;
});

const multer = require('multer');
const {
  uploadConfig,
  handleUploadError,
} = require('./fileUpload');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('fileUpload middleware', () => {
  const importFilter = uploadConfig.import._options.fileFilter;
  const avatarFilter = uploadConfig.avatar._options.fileFilter;

  describe('MIME type doğrulaması', () => {
    it('geçerli jpeg MIME type kabul eder', () => {
      const cb = jest.fn();
      avatarFilter({}, { originalname: 'avatar.jpg', mimetype: 'image/jpeg' }, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('geçerli pdf MIME type kabul eder', () => {
      const cb = jest.fn();
      importFilter({}, { originalname: 'document.pdf', mimetype: 'application/pdf' }, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('geçerli excel MIME type kabul eder', () => {
      const cb = jest.fn();
      importFilter({}, {
        originalname: 'products.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('geçersiz exe MIME type reddeder', () => {
      const cb = jest.fn();
      importFilter({}, { originalname: 'malware.exe', mimetype: 'application/x-msdownload' }, cb);

      expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(cb.mock.calls[0][1]).toBe(false);
    });

    it('geçersiz sh MIME type reddeder', () => {
      const cb = jest.fn();
      importFilter({}, { originalname: 'script.sh', mimetype: 'text/x-shellscript' }, cb);

      expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(cb.mock.calls[0][1]).toBe(false);
    });

    it('geçersiz php MIME type reddeder', () => {
      const cb = jest.fn();
      importFilter({}, { originalname: 'shell.php', mimetype: 'application/x-httpd-php' }, cb);

      expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(cb.mock.calls[0][1]).toBe(false);
    });
  });

  describe('dosya boyutu limiti', () => {
    it('10MB limitini multer config içinde tanımlar', () => {
      expect(uploadConfig.import._options.limits.fileSize).toBe(10 * 1024 * 1024);
      expect(uploadConfig.avatar._options.limits.fileSize).toBe(10 * 1024 * 1024);
    });

    it('LIMIT_FILE_SIZE hatasını doğru mesajla döner', () => {
      const req = {};
      const res = createRes();
      const next = jest.fn();
      const err = new multer.MulterError('LIMIT_FILE_SIZE');

      handleUploadError(err, req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: "Dosya boyutu 10MB'dan büyük olamaz",
      }));
    });
  });

  describe('path traversal koruması', () => {
    it('path traversal denemesini reddeder', () => {
      const cb = jest.fn();
      importFilter({}, {
        originalname: '../../../etc/passwd',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }, cb);

      expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(cb.mock.calls[0][0].message).toBe('Geçersiz dosya adı');
      expect(cb.mock.calls[0][1]).toBe(false);
    });
  });
});
