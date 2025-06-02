const Joi = require('joi');

/**
 * Cleaner query validation schema
 */
const cleanerQuerySchema = Joi.object({
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
  
  search: Joi.string()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Search query maksimal 255 karakter'
    }),
  
  city: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Nama kota maksimal 100 karakter'
    }),
  
  minRating: Joi.number()
    .min(0)
    .max(5)
    .optional()
    .messages({
      'number.min': 'Rating minimum tidak boleh negatif',
      'number.max': 'Rating maximum adalah 5'
    }),
  
  maxPrice: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Harga maksimum tidak boleh negatif'
    }),
  
  sortBy: Joi.string()
    .valid('name', 'rating', 'total_jobs', 'hourly_rate', 'created_at')
    .default('rating')
    .messages({
      'any.only': 'Sort by harus salah satu dari: name, rating, total_jobs, hourly_rate, created_at'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order harus asc atau desc'
    }),
  
  isAvailable: Joi.boolean()
    .optional(),
  
  skills: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
    .optional()
});

/**
 * Cleaner ID parameter validation schema
 */
const cleanerIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID pembersih tidak valid',
      'any.required': 'ID pembersih wajib diisi'
    })
});

/**
 * Update cleaner profile validation schema
 */
const updateCleanerProfileSchema = Joi.object({
  bio: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Bio maksimal 1000 karakter'
    }),
  
  experienceYears: Joi.number()
    .min(0)
    .max(50)
    .optional()
    .messages({
      'number.min': 'Pengalaman tidak boleh negatif',
      'number.max': 'Pengalaman maksimal 50 tahun'
    }),
  
  hourlyRate: Joi.number()
    .min(10000)
    .max(1000000)
    .optional()
    .messages({
      'number.min': 'Tarif per jam minimal Rp10.000',
      'number.max': 'Tarif per jam maksimal Rp1.000.000'
    }),
  
  serviceAreas: Joi.array()
    .items(Joi.string().max(100))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maksimal 10 area layanan',
      'string.max': 'Nama area maksimal 100 karakter'
    }),
  
  skills: Joi.array()
    .items(Joi.string().max(100))
    .max(15)
    .optional()
    .messages({
      'array.max': 'Maksimal 15 keahlian',
      'string.max': 'Nama keahlian maksimal 100 karakter'
    }),
  
  equipmentProvided: Joi.boolean()
    .optional()
});

/**
 * Update availability validation schema
 */
const updateAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Status ketersediaan wajib diisi'
    })
});

/**
 * Update schedules validation schema
 */
const updateSchedulesSchema = Joi.object({
  schedules: Joi.array()
    .items(
      Joi.object({
        dayOfWeek: Joi.number()
          .min(0)
          .max(6)
          .required()
          .messages({
            'number.min': 'Hari dalam minggu harus 0-6 (0=Minggu)',
            'number.max': 'Hari dalam minggu harus 0-6 (6=Sabtu)',
            'any.required': 'Hari dalam minggu wajib diisi'
          }),
        
        startTime: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .required()
          .messages({
            'string.pattern.base': 'Format waktu mulai harus HH:MM (24 jam)',
            'any.required': 'Waktu mulai wajib diisi'
          }),
        
        endTime: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .required()
          .messages({
            'string.pattern.base': 'Format waktu selesai harus HH:MM (24 jam)',
            'any.required': 'Waktu selesai wajib diisi'
          }),
        
        isAvailable: Joi.boolean()
          .default(true)
      })
    )
    .max(7)
    .optional()
    .messages({
      'array.max': 'Maksimal 7 jadwal (satu untuk setiap hari)'
    })
});

/**
 * Search cleaners validation schema
 */
const searchCleanersSchema = Joi.object({
  query: Joi.string()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Query pencarian maksimal 255 karakter'
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
  
  radius: Joi.number()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .messages({
      'number.min': 'Radius minimal 1 km',
      'number.max': 'Radius maksimal 100 km'
    }),
  
  serviceDate: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Tanggal layanan tidak boleh di masa lalu'
    }),
  
  serviceTime: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Format waktu layanan harus HH:MM (24 jam)'
    }),
  
  minRating: Joi.number()
    .min(0)
    .max(5)
    .default(0)
    .optional()
    .messages({
      'number.min': 'Rating minimum tidak boleh negatif',
      'number.max': 'Rating maximum adalah 5'
    }),
  
  maxPrice: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Harga maksimum tidak boleh negatif'
    }),
  
  skills: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
    .optional(),
  
  sortBy: Joi.string()
    .valid('rating', 'price', 'distance', 'total_jobs')
    .default('rating')
    .messages({
      'any.only': 'Sort by harus salah satu dari: rating, price, distance, total_jobs'
    })
});

/**
 * Custom validation for schedule time logic
 */
const validateScheduleTime = (schedules) => {
  if (!schedules || !Array.isArray(schedules)) {
    return { isValid: true };
  }

  for (const schedule of schedules) {
    const startTime = schedule.startTime;
    const endTime = schedule.endTime;
    
    // Convert time to minutes for comparison
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    
    if (endMinutes <= startMinutes) {
      return {
        isValid: false,
        message: 'Waktu selesai harus lebih besar dari waktu mulai'
      };
    }
  }

  return { isValid: true };
};

module.exports = {
  cleanerQuerySchema,
  cleanerIdSchema,
  updateCleanerProfileSchema,
  updateAvailabilitySchema,
  updateSchedulesSchema,
  searchCleanersSchema,
  validateScheduleTime
};