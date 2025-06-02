const express = require('express');
const authRoutes = require('./authRoutes');
const serviceRoutes = require('./serviceRoutes');
const cleanerRoutes = require('./cleanerRoutes');
const orderRoutes = require('./orderRoutes');
const addressRoutes = require('./addressRoutes'); // Already imported ✅

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
      
      // Cleaners
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
      
      // Orders
      orders: {
        create: 'POST /api/v1/orders (Customer)',
        list: 'GET /api/v1/orders',
        detail: 'GET /api/v1/orders/:id',
        stats: 'GET /api/v1/orders/stats',
        updateStatus: 'PUT /api/v1/orders/:id/status (Cleaner/Admin)',
        cancel: 'POST /api/v1/orders/:id/cancel'
      },
      
      // Addresses ✅ Updated!
      addresses: {
        list: 'GET /api/v1/addresses',
        detail: 'GET /api/v1/addresses/:id',
        main: 'GET /api/v1/addresses/main',
        stats: 'GET /api/v1/addresses/stats',
        create: 'POST /api/v1/addresses',
        update: 'PUT /api/v1/addresses/:id',
        setMain: 'PUT /api/v1/addresses/:id/main',
        delete: 'DELETE /api/v1/addresses/:id'
      },
      
      // Coming soon
      reviews: 'GET /api/v1/reviews (Coming Soon)',
      payments: 'GET /api/v1/payments (Coming Soon)',
      notifications: 'GET /api/v1/notifications (Coming Soon)',
      promotions: 'GET /api/v1/promotions (Coming Soon)'
      // Removed redundant 'addresses' entry from Coming Soon
    },
    
    // Sample requests
    examples: {
      createOrder: {
        method: 'POST',
        url: '/api/v1/orders',
        headers: {
          'Authorization': 'Bearer customer_token_here',
          'Content-Type': 'application/json'
        },
        body: {
          cleanerId: 'uuid-here',
          serviceId: 'uuid-here',
          serviceDate: '2025-04-29',
          startTime: '10:00',
          endTime: '12:00',
          serviceAddress: 'Jl. Teuku Umar No. 24, Banda Aceh',
          basePrice: 150000,
          additionalServices: ['Pembersihan Jendela'],
          additionalServicesPrice: 30000,
          totalPrice: 195000,
          specialInstructions: 'Mohon bawa peralatan sendiri'
        }
      },
      updateOrderStatus: {
        method: 'PUT',
        url: '/api/v1/orders/:id/status',
        headers: {
          'Authorization': 'Bearer cleaner_token_here',
          'Content-Type': 'application/json'
        },
        body: {
          status: 'confirmed',
          notes: 'Pesanan dikonfirmasi, akan tiba dalam 30 menit'
        }
      },
      createAddress: {
        method: 'POST',
        url: '/api/v1/addresses',
        headers: {
          'Authorization': 'Bearer user_token_here',
          'Content-Type': 'application/json'
        },
        body: {
          label: 'Rumah',
          fullAddress: 'Jl. Teuku Umar No. 24, Banda Aceh',
          city: 'Banda Aceh',
          postalCode: '23111',
          isMain: true
        }
      },
      listAddresses: {
        method: 'GET',
        url: '/api/v1/addresses?page=1&limit=10',
        headers: {
          'Authorization': 'Bearer user_token_here'
        }
      }
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/cleaners', cleanerRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes); // ✅ Mount the addressRoutes

// Placeholder for future routes
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