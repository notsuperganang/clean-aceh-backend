const Joi = require('joi');

// Define environment validation schema
const envSchema = Joi.object({
  // Supabase Configuration
  SUPABASE_URL: Joi.string().uri().required()
    .messages({
      'string.uri': 'SUPABASE_URL must be a valid URL',
      'any.required': 'SUPABASE_URL is required'
    }),
  
  SUPABASE_ANON_KEY: Joi.string().required()
    .messages({
      'any.required': 'SUPABASE_ANON_KEY is required'
    }),
  
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required()
    .messages({
      'any.required': 'SUPABASE_SERVICE_ROLE_KEY is required'
    }),

  // Server Configuration
  PORT: Joi.number().port().default(3000),
  
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required()
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters long',
      'any.required': 'JWT_SECRET is required'
    }),
  
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // CORS Configuration
  FRONTEND_URL: Joi.string().uri().default('*')
    .messages({
      'string.uri': 'FRONTEND_URL must be a valid URL'
    })
}).unknown(); // Allow other environment variables

/**
 * Validate environment variables
 * @returns {Object} Validated environment variables
 * @throws {Error} If validation fails
 */
const validateEnv = () => {
  const { error, value: envVars } = envSchema.validate(process.env);

  if (error) {
    const errorMessage = error.details
      .map(detail => detail.message)
      .join(', ');
    
    throw new Error(`Environment validation error: ${errorMessage}`);
  }

  return envVars;
};

/**
 * Check if environment is production
 * @returns {boolean}
 */
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if environment is development
 * @returns {boolean}
 */
const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if environment is test
 * @returns {boolean}
 */
const isTest = () => {
  return process.env.NODE_ENV === 'test';
};

module.exports = {
  validateEnv,
  isProduction,
  isDevelopment,
  isTest
};