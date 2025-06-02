const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validator');
const { asyncHandler } = require('../utils/response');
const {
  createPaymentSchema,
  paymentQuerySchema,
  paymentIdSchema,
  addPaymentMethodSchema,
  paymentMethodIdSchema
} = require('../validators/paymentValidator');
const {
  createPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  // Payment Methods Management
  getUserPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod
} = require('../controllers/paymentController');

const router = express.Router();

// ============================================
// PAYMENT PROCESSING ROUTES
// ============================================

/**
 * @route POST /api/v1/payments/create
 * @desc Create payment for order
 * @access Private
 */
router.post('/create', 
  authenticateToken,
  validateBody(createPaymentSchema),
  asyncHandler(createPayment)
);

/**
 * @route POST /api/v1/payments/webhook
 * @desc Handle Midtrans webhook
 * @access Public (Midtrans webhook)
 */
router.post('/webhook', asyncHandler(handleWebhook));

/**
 * @route GET /api/v1/payments/history
 * @desc Get user payment history
 * @access Private
 */
router.get('/history', 
  authenticateToken,
  validateQuery(paymentQuerySchema),
  asyncHandler(getPaymentHistory)
);

/**
 * @route GET /api/v1/payments/:id
 * @desc Get payment by ID
 * @access Private
 */
router.get('/:id', 
  authenticateToken,
  validateParams(paymentIdSchema),
  asyncHandler(getPaymentById)
);

// ============================================
// PAYMENT METHODS MANAGEMENT ROUTES
// ============================================

/**
 * @route GET /api/v1/payments/methods
 * @desc Get user payment methods
 * @access Private
 */
router.get('/methods', 
  authenticateToken,
  asyncHandler(getUserPaymentMethods)
);

/**
 * @route POST /api/v1/payments/methods
 * @desc Add new payment method
 * @access Private
 */
router.post('/methods', 
  authenticateToken,
  validateBody(addPaymentMethodSchema),
  asyncHandler(addPaymentMethod)
);

/**
 * @route DELETE /api/v1/payments/methods/:id
 * @desc Delete payment method
 * @access Private
 */
router.delete('/methods/:id', 
  authenticateToken,
  validateParams(paymentMethodIdSchema),
  asyncHandler(deletePaymentMethod)
);

module.exports = router;