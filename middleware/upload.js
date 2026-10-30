const multer = require('multer');

// Memory storage to process files directly in buffer without writing temporary files to public folders
const storage = multer.memoryStorage();

const excelUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    const isExcel = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');
    if (isExcel || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos en formato Excel (.xlsx, .xls)'));
    }
  }
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes en formato PNG o JPG'));
    }
  }
});

module.exports = {
  excelUpload,
  imageUpload
};
