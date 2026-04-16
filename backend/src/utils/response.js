/**
 * Standardized API Response Helpers
 * All controllers should use these functions for consistent response formatting.
 */

/**
 * Send a success response
 * @param {object} res - Express response object
 * @param {any} data - Payload to return in `result`
 * @param {string} message - Human-readable success message
 * @param {number} code - HTTP status code (default 200)
 */
const success = (res, data = null, message = 'Success', code = 200) => {
    return res.status(code).json({
        success: true,
        message,
        result: data
    });
};

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {number} code - HTTP status code (default 400)
 */
const error = (res, message = 'Error', code = 400) => {
    return res.status(code).json({
        success: false,
        message,
        result: null
    });
};

module.exports = { success, error };
