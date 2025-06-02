const Joi = require('joi');

/**
 * Create service validation schema
 */
const createServiceSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.min': 'Nama service minimal 3 karakter',
      'string.max': 'Nama service maksimal 255 karakter',
      'any.required': 'Nama service wajib diisi'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Deskripsi maksimal 1000 karakter'
    }),
  
  basePrice: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Harga tidak boleh negatif',
      'any.required': 'Harga dasar wajib diisi'
    }),
  
  durationHours: Joi.number()
    .min(1)
    .max(24)
    .optional()
    .messages({
      'number.min': 'Durasi minimal 1 jam',
      'number.max': 'Durasi maksimal 24 jam'
    }),
  
  category: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Kategori maksimal 100 karakter'
    }),
  
  isActive: Joi.boolean()
    .default(true)
});

/**
 * Update service validation schema
 */
const updateServiceSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Nama service minimal 3 karakter',
      'string.max': 'Nama service maksimal 255 karakter'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Deskripsi maksimal 1000 karakter'
    }),
  
  basePrice: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Harga tidak boleh negatif'
    }),
  
  durationHours: Joi.number()
    .min(0.5)
    .max(24)
    .optional()
    .messages({
      'number.min': 'Durasi minimal 0.5 jam',
      'number.max': 'Durasi maksimal 24 jam'
    }),
  
  category: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Kategori maksimal 100 karakter'
    }),
  
  isActive: Joi.boolean()
    .optional()
});

/**
 * Service query validation schema
 */
const serviceQuerySchema = Joi.object({
  page: Joi.number()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page minimal 1'
    }),
  
  limit: Joi.number()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit minimal 1',
      'number.max': 'Limit maksimal 100'
    }),
  
  search: Joi.string()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Search query maksimal 255 karakter'
    }),
  
  category: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Kategori maksimal 100 karakter'
    }),
  
  minPrice: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Harga minimum tidak boleh negatif'
    }),
  
  maxPrice: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Harga maksimum tidak boleh negatif'
    }),
  
  sortBy: Joi.string()
    .valid('name', 'base_price', 'created_at', 'category')
    .default('name')
    .messages({
      'any.only': 'Sort by harus salah satu dari: name, base_price, created_at, category'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .messages({
      'any.only': 'Sort order harus asc atau desc'
    }),
  
  isActive: Joi.boolean()
    .optional()
});

/**
 * Service ID parameter validation schema
 */
const serviceIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID service tidak valid',
      'any.required': 'ID service wajib diisi'
    })
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
  serviceIdSchema
};