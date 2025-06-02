const Joi = require('joi');

/**
 * Create address validation schema
 */
const createAddressSchema = Joi.object({
  label: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Label alamat minimal 2 karakter',
      'string.max': 'Label alamat maksimal 100 karakter',
      'any.required': 'Label alamat wajib diisi'
    }),
  
  fullAddress: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Alamat lengkap minimal 10 karakter',
      'string.max': 'Alamat lengkap maksimal 500 karakter',
      'any.required': 'Alamat lengkap wajib diisi'
    }),
  
  city: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Nama kota minimal 2 karakter',
      'string.max': 'Nama kota maksimal 100 karakter',
      'any.required': 'Kota wajib diisi'
    }),
  
  postalCode: Joi.string()
    .pattern(/^[0-9]{5}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Kode pos harus 5 digit angka'
    }),
  
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .messages({
      'number.min': 'Latitude harus antara -90 dan 90',
      'number.max': 'Latitude harus antara -90 dan 90'
    }),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .messages({
      'number.min': 'Longitude harus antara -180 dan 180',
      'number.max': 'Longitude harus antara -180 dan 180'
    }),
  
  isMain: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isMain harus bernilai true atau false'
    })
});

/**
 * Update address validation schema
 */
const updateAddressSchema = Joi.object({
  label: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Label alamat minimal 2 karakter',
      'string.max': 'Label alamat maksimal 100 karakter'
    }),
  
  fullAddress: Joi.string()
    .min(10)
    .max(500)
    .optional()
    .messages({
      'string.min': 'Alamat lengkap minimal 10 karakter',
      'string.max': 'Alamat lengkap maksimal 500 karakter'
    }),
  
  city: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Nama kota minimal 2 karakter',
      'string.max': 'Nama kota maksimal 100 karakter'
    }),
  
  postalCode: Joi.string()
    .pattern(/^[0-9]{5}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Kode pos harus 5 digit angka'
    }),
  
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .messages({
      'number.min': 'Latitude harus antara -90 dan 90',
      'number.max': 'Latitude harus antara -90 dan 90'
    }),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .messages({
      'number.min': 'Longitude harus antara -180 dan 180',
      'number.max': 'Longitude harus antara -180 dan 180'
    }),
  
  isMain: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isMain harus bernilai true atau false'
    })
});

/**
 * Address query validation schema
 */
const addressQuerySchema = Joi.object({
  page: Joi.number()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page minimal 1'
    }),
  
  limit: Joi.number()
    .min(1)
    .max(50)
    .default(20)
    .messages({
      'number.min': 'Limit minimal 1',
      'number.max': 'Limit maksimal 50'
    }),
  
  city: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Nama kota maksimal 100 karakter'
    })
});

/**
 * Address ID parameter validation
 */
const addressIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID alamat tidak valid',
      'any.required': 'ID alamat wajib diisi'
    })
});

/**
 * Set main address validation schema
 */
const setMainAddressSchema = Joi.object({
  isMain: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Status alamat utama wajib diisi',
      'boolean.base': 'isMain harus bernilai true atau false'
    })
});

module.exports = {
  createAddressSchema,
  updateAddressSchema,
  addressQuerySchema,
  addressIdSchema,
  setMainAddressSchema
};