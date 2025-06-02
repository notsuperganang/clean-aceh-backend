const Joi = require('joi');

/**
 * Register validation schema
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Format email tidak valid',
      'any.required': 'Email wajib diisi'
    }),
  
  phone: Joi.string()
    .pattern(/^\+62[0-9]{9,12}$/)
    .required()
    .messages({
      'string.pattern.base': 'Format nomor telepon tidak valid (gunakan +62xxxxxxxxx)',
      'any.required': 'Nomor telepon wajib diisi'
    }),
  
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password minimal 8 karakter',
      'any.required': 'Password wajib diisi'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Konfirmasi password tidak cocok',
      'any.required': 'Konfirmasi password wajib diisi'
    }),
  
  fullName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Nama lengkap minimal 2 karakter',
      'string.max': 'Nama lengkap maksimal 100 karakter',
      'any.required': 'Nama lengkap wajib diisi'
    }),
  
  userType: Joi.string()
    .valid('customer', 'cleaner')
    .default('customer')
    .messages({
      'any.only': 'Tipe user harus customer atau cleaner'
    }),
  
  dateOfBirth: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Tanggal lahir tidak valid'
    })
});

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
  emailOrPhone: Joi.string()
    .required()
    .messages({
      'any.required': 'Email atau nomor telepon wajib diisi'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password wajib diisi'
    })
});

/**
 * Change password validation schema
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Password saat ini wajib diisi'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password baru minimal 8 karakter',
      'any.required': 'Password baru wajib diisi'
    }),
  
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Konfirmasi password baru tidak cocok',
      'any.required': 'Konfirmasi password baru wajib diisi'
    })
});

/**
 * Forgot password validation schema
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Format email tidak valid',
      'any.required': 'Email wajib diisi'
    })
});

/**
 * Reset password validation schema
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Token reset password wajib diisi'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password baru minimal 8 karakter',
      'any.required': 'Password baru wajib diisi'
    }),
  
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Konfirmasi password baru tidak cocok',
      'any.required': 'Konfirmasi password baru wajib diisi'
    })
});

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token wajib diisi'
    })
});

/**
 * Update profile validation schema
 */
const updateProfileSchema = Joi.object({
  fullName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Nama lengkap minimal 2 karakter',
      'string.max': 'Nama lengkap maksimal 100 karakter'
    }),
  
  dateOfBirth: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Tanggal lahir tidak valid'
    }),
  
  profilePictureUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'URL foto profil tidak valid'
    })
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  updateProfileSchema
};