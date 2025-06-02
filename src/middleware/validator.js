const { sendValidationError } = require('../utils/response');

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Property to validate ('body', 'params', 'query')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true   // Remove unknown fields
    });

    if (error) {
      return sendValidationError(res, error);
    }

    // Replace request property with validated and sanitized value
    req[property] = value;
    next();
  };
};

/**
 * Validate request body
 * @param {Object} schema - Joi validation schema
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate request params
 * @param {Object} schema - Joi validation schema  
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Validate request query
 * @param {Object} schema - Joi validation schema
 */
const validateQuery = (schema) => validate(schema, 'query');

module.exports = {
  validate,
  validateBody,
  validateParams,
  validateQuery
};