const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validator');
const { asyncHandler } = require('../utils/response');
const {
  createAddressSchema,
  updateAddressSchema,
  addressQuerySchema,
  addressIdSchema,
  setMainAddressSchema
} = require('../validators/addressValidator');
const {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  setMainAddress,
  deleteAddress,
  getMainAddress,
  getAddressStats
} = require('../controllers/addressController');

const router = express.Router();

// ============================================
// USER ADDRESS ROUTES (Authentication required)
// ============================================

/**
 * @route GET /api/v1/addresses
 * @desc Get user's addresses with pagination
 * @access Private
 * @example /api/v1/addresses?page=1&limit=10&city=Banda Aceh
 */
router.get('/', 
  authenticateToken,
  validateQuery(addressQuerySchema),
  asyncHandler(getUserAddresses)
);

/**
 * @route GET /api/v1/addresses/main
 * @desc Get user's main address
 * @access Private
 */
router.get('/main', 
  authenticateToken,
  asyncHandler(getMainAddress)
);

/**
 * @route GET /api/v1/addresses/stats
 * @desc Get address statistics for current user
 * @access Private
 */
router.get('/stats', 
  authenticateToken,
  asyncHandler(getAddressStats)
);

/**
 * @route POST /api/v1/addresses
 * @desc Create new address
 * @access Private
 */
router.post('/', 
  authenticateToken,
  validateBody(createAddressSchema),
  asyncHandler(createAddress)
);

/**
 * @route GET /api/v1/addresses/:id
 * @desc Get address by ID
 * @access Private
 */
router.get('/:id', 
  authenticateToken,
  validateParams(addressIdSchema),
  asyncHandler(getAddressById)
);

/**
 * @route PUT /api/v1/addresses/:id
 * @desc Update address
 * @access Private
 */
router.put('/:id', 
  authenticateToken,
  validateParams(addressIdSchema),
  validateBody(updateAddressSchema),
  asyncHandler(updateAddress)
);

/**
 * @route PUT /api/v1/addresses/:id/main
 * @desc Set address as main or remove main status
 * @access Private
 */
router.put('/:id/main', 
  authenticateToken,
  validateParams(addressIdSchema),
  validateBody(setMainAddressSchema),
  asyncHandler(setMainAddress)
);

/**
 * @route DELETE /api/v1/addresses/:id
 * @desc Delete address
 * @access Private
 */
router.delete('/:id', 
  authenticateToken,
  validateParams(addressIdSchema),
  asyncHandler(deleteAddress)
);

module.exports = router;