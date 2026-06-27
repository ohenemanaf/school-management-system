const errorHandler = (err, req, res, next) => {
    console.error('Unhandled Exception:', err);

    // Default error structure
    let statusCode = 500;
    let message = 'An unexpected server error occurred';

    // Handle MySQL specific errors
    if (err.code) {
        switch (err.code) {
            case 'ER_DUP_ENTRY':
                statusCode = 409;
                message = 'Duplicate entry found. This record already exists.';
                break;
            case 'ER_NO_REFERENCED_ROW_2':
                statusCode = 400;
                message = 'Invalid reference. The related record does not exist.';
                break;
            case 'ER_BAD_NULL_ERROR':
                statusCode = 400;
                message = 'Missing required fields.';
                break;
            default:
                if (err.code.startsWith('ER_')) {
                    statusCode = 500;
                    message = `Database Error: ${err.sqlMessage || 'Internal configuration error'}`;
                }
        }
    }

    res.status(statusCode).json({
        message,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = errorHandler;
