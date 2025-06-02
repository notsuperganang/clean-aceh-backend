/**
 * Standard API Response Helper
 * Provides consistent response format across all endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const response = {
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString()
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} errors - Detailed error information
 */
const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      message,
      statusCode,
      errors,
      timestamp: response.timestamp
    });
  }

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Object} validationErrors - Joi validation errors
 */
const sendValidationError = (res, validationErrors) => {
  const errors = validationErrors.details.map(error => ({
    field: error.context.key,
    message: error.message.replace(/"/g, ''),
    value: error.context.value
  }));

  return sendError(res, 'Validation failed', 422, errors);
};

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Custom error message
 */
const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return sendError(res, message, 401);
};

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Custom error message
 */
const sendForbidden = (res, message = 'Access forbidden') => {
  return sendError(res, message, 403);
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {string} message - Custom error message
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, message, 404);
};

/**
 * Send conflict response
 * @param {Object} res - Express response object
 * @param {string} message - Custom error message
 */
const sendConflict = (res, message = 'Resource already exists') => {
  return sendError(res, message, 409);
};

/**
 * Send pagination response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
const sendPaginated = (res, data, pagination, message = 'Data retrieved successfully') => {
  const meta = {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  };

  return sendSuccess(res, data, message, 200, meta);
};

/**
 * Create pagination object from query parameters
 * @param {Object} query - Express request query
 * @returns {Object} Pagination object
 */
const createPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset
  };
};

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Express route handler with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendPaginated,
  createPagination,
  asyncHandler
};