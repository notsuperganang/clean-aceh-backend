const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validator');
const { asyncHandler } = require('../utils/response');
const {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
  serviceIdSchema
} = require('../validators/serviceValidator');
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceCategories,
  getServiceStats
} = require('../controllers/serviceController');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route GET /api/v1/services
 * @desc Get all services with pagination, search, and filters
 * @access Public
 */
router.get('/', 
  validateQuery(serviceQuerySchema), 
  asyncHandler(getServices)
);

/**
 * @route GET /api/v1/services/categories
 * @desc Get service categories
 * @access Public
 */
router.get('/categories', asyncHandler(getServiceCategories));

/**
 * @route GET /api/v1/services/admin/stats
 * @desc Get service statistics
 * @access Private (Admin only)
 */
router.get('/admin/stats', 
  authenticateToken,
  requireAdmin,
  asyncHandler(getServiceStats)
);

/**
 * @route GET /api/v1/services/:id
 * @desc Get service by ID
 * @access Public
 */
router.get('/:id', 
  validateParams(serviceIdSchema), 
  asyncHandler(getServiceById)
);

// ============================================
// ADMIN ROUTES (Authentication + Admin role required)
// ============================================

/**
 * @route POST /api/v1/services
 * @desc Create new service
 * @access Private (Admin only)
 */
router.post('/', 
  authenticateToken,
  requireAdmin,
  validateBody(createServiceSchema), 
  asyncHandler(createService)
);

/**
 * @route PUT /api/v1/services/:id
 * @desc Update service
 * @access Private (Admin only)
 */
router.put('/:id', 
  authenticateToken,
  requireAdmin,
  validateParams(serviceIdSchema),
  validateBody(updateServiceSchema), 
  asyncHandler(updateService)
);

/**
 * @route DELETE /api/v1/services/:id
 * @desc Delete service
 * @access Private (Admin only)
 */
router.delete('/:id', 
  authenticateToken,
  requireAdmin,
  validateParams(serviceIdSchema), 
  asyncHandler(deleteService)
);

module.exports = router;