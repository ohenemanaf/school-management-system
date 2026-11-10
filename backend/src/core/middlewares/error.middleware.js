const multer = require('multer');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : 'Invalid file upload.';
        return res.status(400).json({ message });
    }
    if (err.status && err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({ message: err.message });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Malformed JSON body.' });
    }

    const known = {
        ER_DUP_ENTRY: [409, 'Duplicate entry found. This record already exists.'],
        ER_NO_REFERENCED_ROW_2: [400, 'Invalid reference. The related record does not exist.'],
        ER_ROW_IS_REFERENCED_2: [409, 'This record is still in use and cannot be deleted.'],
        ER_BAD_NULL_ERROR: [400, 'Missing required fields.'],
    }[err.code];
    if (known) return res.status(known[0]).json({ message: known[1] });

    // Unknown failures: log the detail, never send SQL or stack details to clients.
    console.error('Unhandled Exception:', err);
    res.status(500).json({
        message: 'An unexpected server error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
};

module.exports = errorHandler;
