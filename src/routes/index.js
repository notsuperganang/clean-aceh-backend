const express = require('express');
const authRoutes = require('./authRoutes');

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
      
      // Coming soon
      users: 'GET /api/v1/users (Coming Soon)',
      services: 'GET /api/v1/services (Coming Soon)',
      cleaners: 'GET /api/v1/cleaners (Coming Soon)',
      orders: 'GET /api/v1/orders (Coming Soon)',
      reviews: 'GET /api/v1/reviews (Coming Soon)',
      payments: 'GET /api/v1/payments (Coming Soon)',
      notifications: 'GET /api/v1/notifications (Coming Soon)',
      promotions: 'GET /api/v1/promotions (Coming Soon)'
    },
    
    // Sample requests
    examples: {
      register: {
        method: 'POST',
        url: '/api/v1/auth/register',
        body: {
          email: 'user@example.com',
          phone: '+62812345678901',
          password: 'password123',
          confirmPassword: 'password123',
          fullName: 'John Doe',
          userType: 'customer'
        }
      },
      login: {
        method: 'POST',
        url: '/api/v1/auth/login',
        body: {
          emailOrPhone: 'user@example.com',
          password: 'password123'
        }
      }
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);

// Placeholder for future routes
router.use('/users', (req, res) => {
  res.status(501).json({
    message: 'User management endpoints coming soon',
    plannedEndpoints: [
      'GET /users - List users',
      'GET /users/:id - Get user by ID',
      'PUT /users/:id - Update user',
      'DELETE /users/:id - Delete user'
    ]
  });
});

router.use('/services', (req, res) => {
  res.status(501).json({
    message: 'Service management endpoints coming soon',
    plannedEndpoints: [
      'GET /services - List services',
      'GET /services/:id - Get service by ID',
      'POST /services - Create service',
      'PUT /services/:id - Update service',
      'DELETE /services/:id - Delete service'
    ]
  });
});

router.use('/cleaners', (req, res) => {
  res.status(501).json({
    message: 'Cleaner management endpoints coming soon',
    plannedEndpoints: [
      'GET /cleaners - List cleaners',
      'GET /cleaners/:id - Get cleaner by ID',
      'GET /cleaners/search - Search cleaners',
      'PUT /cleaners/:id/availability - Update availability'
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