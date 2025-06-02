const Joi = require('joi');

/**
 * Create order validation schema
 */
const createOrderSchema = Joi.object({
  cleanerId: Joi.string().uuid().required(),
  serviceId: Joi.string().uuid().required(),
  serviceDate: Joi.date().min('now').required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  addressId: Joi.string().uuid().optional(),
  serviceAddress: Joi.string().max(500).required(),
  basePrice: Joi.number().min(0).required(),
  additionalServices: Joi.array().items(Joi.string()).optional(),
  additionalServicesPrice: Joi.number().min(0).default(0),
  platformFee: Joi.number().min(0).default(10000),
  taxAmount: Joi.number().min(0).optional(),
  totalPrice: Joi.number().min(0).required(),
  specialInstructions: Joi.string().max(1000).optional()
});

/**
 * Update order status validation schema
 */
const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'in_progress', 'on_the_way', 'completed', 'cancelled').required(),
  notes: Joi.string().max(500).optional()
});

/**
 * Cancel order validation schema
 */
const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).optional()
});

/**
 * Order query validation schema
 */
const orderQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(50).default(10),
  status: Joi.alternatives().try(
    Joi.string().valid('pending', 'confirmed', 'in_progress', 'on_the_way', 'completed', 'cancelled'),
    Joi.array().items(Joi.string().valid('pending', 'confirmed', 'in_progress', 'on_the_way', 'completed', 'cancelled'))
  ).optional(),
  sortBy: Joi.string().valid('created_at', 'service_date', 'total_price').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Order ID parameter validation
 */
const orderIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
  orderIdSchema
};