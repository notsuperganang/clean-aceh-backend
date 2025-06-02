const express = require('express');
const { authenticateToken, requireCustomer, requireCleaner, requireCleanerOrAdmin } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validator');
const { asyncHandler } = require('../utils/response');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
  orderIdSchema
} = require('../validators/orderValidator');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} = require('../controllers/orderController');

const router = express.Router();

// ============================================
// CUSTOMER ROUTES
// ============================================

/**
 * @route POST /api/v1/orders
 * @desc Create new order
 * @access Private (Customer only)
 */
router.post('/', 
  authenticateToken,
  requireCustomer,
  validateBody(createOrderSchema), 
  asyncHandler(createOrder)
);

/**
 * @route GET /api/v1/orders
 * @desc Get user's orders (customer or cleaner)
 * @access Private
 */
router.get('/', 
  authenticateToken,
  validateQuery(orderQuerySchema),
  asyncHandler(getUserOrders)
);

/**
 * @route GET /api/v1/orders/stats
 * @desc Get order statistics for dashboard
 * @access Private
 */
router.get('/stats', 
  authenticateToken,
  asyncHandler(getOrderStats)
);

/**
 * @route GET /api/v1/orders/:id
 * @desc Get order by ID
 * @access Private
 */
router.get('/:id', 
  authenticateToken,
  validateParams(orderIdSchema),
  asyncHandler(getOrderById)
);

/**
 * @route PUT /api/v1/orders/:id/status
 * @desc Update order status
 * @access Private (Cleaner/Admin)
 */
router.put('/:id/status', 
  authenticateToken,
  validateParams(orderIdSchema),
  validateBody(updateOrderStatusSchema),
  asyncHandler(updateOrderStatus)
);

/**
 * @route POST /api/v1/orders/:id/cancel
 * @desc Cancel order
 * @access Private
 */
router.post('/:id/cancel', 
  authenticateToken,
  validateParams(orderIdSchema),
  validateBody(cancelOrderSchema),
  asyncHandler(cancelOrder)
);

module.exports = router;