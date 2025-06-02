const Joi = require('joi');

/**
 * Create payment validation schema
 */
const createPaymentSchema = Joi.object({
  orderId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID pesanan tidak valid',
      'any.required': 'ID pesanan wajib diisi'
    }),
  
  paymentMethodId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID metode pembayaran tidak valid',
      'any.required': 'Metode pembayaran wajib diisi'
    })
});

/**
 * Payment query validation schema
 */
const paymentQuerySchema = Joi.object({
  page: Joi.number()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page minimal 1'
    }),
  
  limit: Joi.number()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.min': 'Limit minimal 1',
      'number.max': 'Limit maksimal 50'
    }),
  
  status: Joi.string()
    .valid('pending', 'paid', 'failed', 'refunded')
    .optional()
    .messages({
      'any.only': 'Status harus salah satu dari: pending, paid, failed, refunded'
    })
});

/**
 * Payment ID parameter validation
 */
const paymentIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID pembayaran tidak valid',
      'any.required': 'ID pembayaran wajib diisi'
    })
});

/**
 * Add payment method validation schema
 */
const addPaymentMethodSchema = Joi.object({
  type: Joi.string()
    .valid('ewallet', 'bank_transfer')
    .required()
    .messages({
      'any.only': 'Tipe harus ewallet atau bank_transfer',
      'any.required': 'Tipe metode pembayaran wajib diisi'
    }),
  
  provider: Joi.string()
    .required()
    .messages({
      'any.required': 'Provider wajib diisi'
    }),
  
  accountNumber: Joi.string()
    .min(8)
    .max(20)
    .optional()
    .messages({
      'string.min': 'Nomor akun minimal 8 karakter',
      'string.max': 'Nomor akun maksimal 20 karakter'
    }),
  
  accountName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Nama akun minimal 2 karakter',
      'string.max': 'Nama akun maksimal 100 karakter'
    })
});

/**
 * Payment method ID parameter validation
 */
const paymentMethodIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID metode pembayaran tidak valid',
      'any.required': 'ID metode pembayaran wajib diisi'
    })
});

module.exports = {
  createPaymentSchema,
  paymentQuerySchema,
  paymentIdSchema,
  addPaymentMethodSchema,
  paymentMethodIdSchema
};