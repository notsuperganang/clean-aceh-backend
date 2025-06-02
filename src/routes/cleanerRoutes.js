const express = require('express');
const { authenticateToken, requireCleaner, optionalAuth } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validator');
const { asyncHandler } = require('../utils/response');
const {
  cleanerQuerySchema,
  cleanerIdSchema,
  updateCleanerProfileSchema,
  updateAvailabilitySchema,
  updateSchedulesSchema,
  searchCleanersSchema
} = require('../validators/cleanerValidator');
const {
  getCleaners,
  getCleanerById,
  updateCleanerProfile,
  updateCleanerAvailability,
  getCleanerSchedules,
  updateCleanerSchedules,
  getCleanerStats,
  searchCleaners
} = require('../controllers/cleanerController');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route GET /api/v1/cleaners
 * @desc Get all cleaners with pagination, search, and filters
 * @access Public
 * @example /api/v1/cleaners?page=1&limit=10&city=Banda Aceh&minRating=4.5&sortBy=rating
 */
router.get('/', 
  validateQuery(cleanerQuerySchema), 
  asyncHandler(getCleaners)
);

/**
 * @route GET /api/v1/cleaners/search
 * @desc Advanced cleaner search with location and availability filters
 * @access Public
 * @example /api/v1/cleaners/search?query=Ganang&latitude=-6.2&longitude=106.8&serviceDate=2025-04-29&serviceTime=10:00
 */
router.get('/search', 
  validateQuery(searchCleanersSchema), 
  asyncHandler(searchCleaners)
);

/**
 * @route GET /api/v1/cleaners/:id
 * @desc Get cleaner by ID with detailed information
 * @access Public
 */
router.get('/:id', 
  validateParams(cleanerIdSchema), 
  asyncHandler(getCleanerById)
);

// ============================================
// CLEANER ROUTES (Authentication required - Cleaner only)
// ============================================

/**
 * @route PUT /api/v1/cleaners/profile
 * @desc Update cleaner's own profile
 * @access Private (Cleaner only)
 */
router.put('/profile', 
  authenticateToken,
  requireCleaner,
  validateBody(updateCleanerProfileSchema), 
  asyncHandler(updateCleanerProfile)
);

/**
 * @route PUT /api/v1/cleaners/availability
 * @desc Update cleaner's availability status
 * @access Private (Cleaner only)
 */
router.put('/availability', 
  authenticateToken,
  requireCleaner,
  validateBody(updateAvailabilitySchema), 
  asyncHandler(updateCleanerAvailability)
);

/**
 * @route GET /api/v1/cleaners/schedules/me
 * @desc Get cleaner's own schedules
 * @access Private (Cleaner only)
 */
router.get('/schedules/me', 
  authenticateToken,
  requireCleaner,
  asyncHandler(getCleanerSchedules)
);

/**
 * @route PUT /api/v1/cleaners/schedules
 * @desc Update cleaner's schedules
 * @access Private (Cleaner only)
 */
router.put('/schedules', 
  authenticateToken,
  requireCleaner,
  validateBody(updateSchedulesSchema), 
  asyncHandler(updateCleanerSchedules)
);

/**
 * @route GET /api/v1/cleaners/stats/me
 * @desc Get cleaner's statistics and dashboard data
 * @access Private (Cleaner only)
 */
router.get('/stats/me', 
  authenticateToken,
  requireCleaner,
  asyncHandler(getCleanerStats)
);

// ============================================
// ADDITIONAL UTILITY ROUTES
// ============================================

/**
 * @route GET /api/v1/cleaners/areas/available
 * @desc Get list of available service areas
 * @access Public
 */
router.get('/areas/available', asyncHandler(async (req, res) => {
  try {
    const { data: cleaners, error } = await require('../config/database').supabase
      .from('cleaner_profiles')
      .select('service_areas')
      .eq('is_available', true);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch service areas' });
    }

    // Extract unique service areas
    const allAreas = cleaners.flatMap(cleaner => cleaner.service_areas || []);
    const uniqueAreas = [...new Set(allAreas)].sort();

    res.json({
      status: 'success',
      message: 'Area layanan berhasil diambil',
      data: uniqueAreas,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get service areas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * @route GET /api/v1/cleaners/skills/available
 * @desc Get list of available skills/specializations
 * @access Public
 */
router.get('/skills/available', asyncHandler(async (req, res) => {
  try {
    const { data: cleaners, error } = await require('../config/database').supabase
      .from('cleaner_profiles')
      .select('skills')
      .eq('is_available', true);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch skills' });
    }

    // Extract unique skills with count
    const allSkills = cleaners.flatMap(cleaner => cleaner.skills || []);
    const skillCounts = {};
    allSkills.forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });

    const skillsWithCount = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      status: 'success',
      message: 'Keahlian berhasil diambil',
      data: skillsWithCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

module.exports = router;