const validateId = (req, res, next) => {
  const { id } = req.params;
  if (id !== undefined) {
    const num = parseInt(id, 10);
    if (isNaN(num) || num <= 0 || String(num) !== id) {
      return res.status(400).json({ success: false, message: 'Geçersiz ID formatı' });
    }
  }
  next();
};

module.exports = validateId;
