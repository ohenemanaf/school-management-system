const multer = require('multer');

// CSV imports are parsed in memory, so keep them small.
const uploadCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const looksLikeCsv = /\.csv$/i.test(file.originalname)
            || ['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.mimetype);
        if (looksLikeCsv) return cb(null, true);
        cb(Object.assign(new Error('Only CSV files are allowed.'), { status: 400 }), false);
    },
});

module.exports = uploadCsv;
