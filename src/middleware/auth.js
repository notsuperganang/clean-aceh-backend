const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const { sendUnauthorized, sendForbidden } = require('../utils/response');

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return sendUnauthorized(res, 'Access token required');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, phone, full_name, user_type, status, email_verified, phone_verified')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return sendUnauthorized(res, 'Invalid token');
    }

    // Check if user is active
    if (user.status !== 'active') {
      return sendUnauthorized(res, 'Account is suspended or inactive');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendUnauthorized(res, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Token expired');
    }
    
    console.error('Auth middleware error:', error);
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Check if user has specific role(s)
 * @param {string|Array} roles - Required role(s)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const userRole = req.user.user_type;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!requiredRoles.includes(userRole)) {
      return sendForbidden(res, `Access denied. Required role: ${requiredRoles.join(' or ')}`);
    }

    next();
  };
};

/**
 * Check if user is customer
 */
const requireCustomer = requireRole('customer');

/**
 * Check if user is cleaner
 */
const requireCleaner = requireRole('cleaner');

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Check if user is cleaner or admin
 */
const requireCleanerOrAdmin = requireRole(['cleaner', 'admin']);

/**
 * Optional authentication - attach user if token exists but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // No token, continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, phone, full_name, user_type, status')
      .eq('id', decoded.userId)
      .single();

    if (!error && user && user.status === 'active') {
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    userType: user.user_type
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

/**
 * Generate refresh token (longer expiry)
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user.id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d' // 7 days
  });
};

module.exports = {
  authenticateToken,
  requireRole,
  requireCustomer,
  requireCleaner,
  requireAdmin,
  requireCleanerOrAdmin,
  optionalAuth,
  generateToken,
  generateRefreshToken
};