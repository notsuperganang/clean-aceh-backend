const express = require('express');
const authRoutes = require('./authRoutes');
const serviceRoutes = require('./serviceRoutes');
const cleanerRoutes = require('./cleanerRoutes');

const router = express.Router();

// API Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'CleanAceh API v1',
    version: '1.0.0',
    documentation: 'https://github.com/notsuperganang/clean-aceh-backend',
    endpoints: {
      // Authentication
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        profile: 'GET /api/v1/auth/profile',
        updateProfile: 'PUT /api/v1/auth/profile',
        changePassword: 'PUT /api/v1/auth/change-password',
        refreshToken: 'POST /api/v1/auth/refresh-token',
        logout: 'POST /api/v1/auth/logout'
      },
      
      // Services
      services: {
        list: 'GET /api/v1/services',
        detail: 'GET /api/v1/services/:id',
        categories: 'GET /api/v1/services/categories',
        create: 'POST /api/v1/services (Admin)',
        update: 'PUT /api/v1/services/:id (Admin)',
        delete: 'DELETE /api/v1/services/:id (Admin)',
        stats: 'GET /api/v1/services/admin/stats (Admin)'
      },
      
      // Cleaners ✅ NEW!
      cleaners: {
        list: 'GET /api/v1/cleaners',
        detail: 'GET /api/v1/cleaners/:id',
        search: 'GET /api/v1/cleaners/search',
        availableAreas: 'GET /api/v1/cleaners/areas/available',
        availableSkills: 'GET /api/v1/cleaners/skills/available',
        updateProfile: 'PUT /api/v1/cleaners/profile (Cleaner)',
        updateAvailability: 'PUT /api/v1/cleaners/availability (Cleaner)',
        getSchedules: 'GET /api/v1/cleaners/schedules/me (Cleaner)',
        updateSchedules: 'PUT /api/v1/cleaners/schedules (Cleaner)',
        getStats: 'GET /api/v1/cleaners/stats/me (Cleaner)'
      },
      
      // Coming soon
      orders: 'GET /api/v1/orders (Coming Soon)',
      reviews: 'GET /api/v1/reviews (Coming Soon)',
      payments: 'GET /api/v1/payments (Coming Soon)',
      notifications: 'GET /api/v1/notifications (Coming Soon)',
      promotions: 'GET /api/v1/promotions (Coming Soon)',
      addresses: 'GET /api/v1/addresses (Coming Soon)'
    },
    
    // Sample requests
    examples: {
      register: {
        method: 'POST',
        url: '/api/v1/auth/register',
        body: {
          email: 'cleaner@example.com',
          phone: '+62812345678901',
          password: 'password123',
          confirmPassword: 'password123',
          fullName: 'John Doe',
          userType: 'cleaner'
        }
      },
      login: {
        method: 'POST',
        url: '/api/v1/auth/login',
        body: {
          emailOrPhone: 'cleaner@example.com',
          password: 'password123'
        }
      },
      listCleaners: {
        method: 'GET',
        url: '/api/v1/cleaners?page=1&limit=10&city=Banda Aceh&minRating=4.5&sortBy=rating',
        headers: 'No authentication required'
      },
      searchCleaners: {
        method: 'GET',
        url: '/api/v1/cleaners/search?query=Ganang&latitude=5.5502&longitude=95.3237&serviceDate=2025-04-29&serviceTime=10:00&minRating=4.0',
        headers: 'No authentication required'
      },
      updateCleanerProfile: {
        method: 'PUT',
        url: '/api/v1/cleaners/profile',
        headers: {
          'Authorization': 'Bearer cleaner_token_here',
          'Content-Type': 'application/json'
        },
        body: {
          bio: 'Professional cleaner with 5+ years experience',
          experienceYears: 5,
          hourlyRate: 50000,
          serviceAreas: ['Banda Aceh', 'Sabang'],
          skills: ['Pembersihan Umum', 'Pembersihan Kamar Mandi'],
          equipmentProvided: true
        }
      },
      updateCleanerSchedules: {
        method: 'PUT',
        url: '/api/v1/cleaners/schedules',
        headers: {
          'Authorization': 'Bearer cleaner_token_here',
          'Content-Type': 'application/json'
        },
        body: {
          schedules: [
            {
              dayOfWeek: 1,
              startTime: '08:00',
              endTime: '18:00',
              isAvailable: true
            },
            {
              dayOfWeek: 2,
              startTime: '08:00',
              endTime: '18:00',
              isAvailable: true
            }
          ]
        }
      }
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/cleaners', cleanerRoutes); // ✅ NEW! Cleaner management routes

// Placeholder for future routes with planned endpoints
router.use('/users', (req, res) => {
  res.status(501).json({
    message: 'User management endpoints coming soon',
    plannedEndpoints: [
      'GET /users - List users (Admin)',
      'GET /users/:id - Get user by ID (Admin)',
      'PUT /users/:id - Update user (Admin)',
      'DELETE /users/:id - Delete user (Admin)'
    ]
  });
});

router.use('/orders', (req, res) => {
  res.status(501).json({
    message: 'Order management endpoints coming soon',
    plannedEndpoints: [
      'GET /orders - List orders',
      'GET /orders/:id - Get order by ID',
      'POST /orders - Create order',
      'PUT /orders/:id/status - Update order status',
      'DELETE /orders/:id - Cancel order'
    ]
  });
});

router.use('/addresses', (req, res) => {
  res.status(501).json({
    message: 'Address management endpoints coming soon',
    plannedEndpoints: [
      'GET /addresses - List user addresses',
      'GET /addresses/:id - Get address by ID',
      'POST /addresses - Create address',
      'PUT /addresses/:id - Update address',
      'DELETE /addresses/:id - Delete address'
    ]
  });
});

router.use('/reviews', (req, res) => {
  res.status(501).json({
    message: 'Review management endpoints coming soon',
    plannedEndpoints: [
      'GET /reviews - List reviews',
      'GET /reviews/cleaner/:cleanerId - Get reviews for cleaner',
      'POST /reviews - Create review',
      'PUT /reviews/:id - Update review',
      'DELETE /reviews/:id - Delete review'
    ]
  });
});

router.use('/payments', (req, res) => {
  res.status(501).json({
    message: 'Payment management endpoints coming soon',
    plannedEndpoints: [
      'POST /payments/create - Create payment',
      'GET /payments/:id - Get payment status',
      'POST /payments/webhook - Payment webhook',
      'GET /payments/methods - Get payment methods'
    ]
  });
});

router.use('/notifications', (req, res) => {
  res.status(501).json({
    message: 'Notification endpoints coming soon',
    plannedEndpoints: [
      'GET /notifications - List notifications',
      'PUT /notifications/:id/read - Mark as read',
      'POST /notifications - Send notification',
      'DELETE /notifications/:id - Delete notification'
    ]
  });
});

router.use('/promotions', (req, res) => {
  res.status(501).json({
    message: 'Promotion endpoints coming soon',
    plannedEndpoints: [
      'GET /promotions - List promotions',
      'GET /promotions/validate/:code - Validate promo code',
      'POST /promotions - Create promotion',
      'PUT /promotions/:id - Update promotion'
    ]
  });
});

module.exports = router;