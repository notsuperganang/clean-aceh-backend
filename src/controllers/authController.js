const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendConflict,
  sendNotFound,
  sendUnauthorized
} = require('../utils/response');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  updateProfileSchema
} = require('../validators/authValidator');

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return sendValidationError(res, error);
    }

    const { email, phone, password, fullName, userType, dateOfBirth } = value;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, phone')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .single();

    if (existingUser) {
      if (existingUser.email === email) {
        return sendConflict(res, 'Email sudah terdaftar');
      }
      if (existingUser.phone === phone) {
        return sendConflict(res, 'Nomor telepon sudah terdaftar');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        phone,
        password_hash: passwordHash,
        full_name: fullName,
        user_type: userType,
        date_of_birth: dateOfBirth,
        status: 'active',
        email_verified: false,
        phone_verified: false
      })
      .select('id, email, phone, full_name, user_type, status, created_at')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return sendError(res, 'Gagal membuat akun', 500);
    }

    // Generate tokens
    const accessToken = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Return success response
    sendSuccess(res, {
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        fullName: newUser.full_name,
        userType: newUser.user_type,
        status: newUser.status,
        createdAt: newUser.created_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    }, 'Registrasi berhasil', 201);

  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return sendValidationError(res, error);
    }

    const { emailOrPhone, password } = value;

    // Find user by email or phone
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, phone, password_hash, full_name, user_type, status, email_verified, phone_verified')
      .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
      .single();

    if (findError || !user) {
      return sendUnauthorized(res, 'Email/nomor telepon atau password salah');
    }

    // Check account status
    if (user.status !== 'active') {
      return sendUnauthorized(res, 'Akun Anda telah dinonaktifkan. Hubungi customer service.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return sendUnauthorized(res, 'Email/nomor telepon atau password salah');
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Get additional user data based on user type
    let additionalData = {};
    
    if (user.user_type === 'cleaner') {
      const { data: cleanerProfile } = await supabase
        .from('cleaner_profiles')
        .select('id, bio, experience_years, hourly_rate, rating, total_jobs, is_available, profile_verified')
        .eq('user_id', user.id)
        .single();
      
      additionalData.cleanerProfile = cleanerProfile;
    }

    // Return success response
    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.full_name,
        userType: user.user_type,
        status: user.status,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        ...additionalData
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    }, 'Login berhasil');

  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const { user } = req;

    // Get additional user data based on user type
    let additionalData = {};
    
    if (user.user_type === 'cleaner') {
      const { data: cleanerProfile } = await supabase
        .from('cleaner_profiles')
        .select('id, bio, experience_years, hourly_rate, rating, total_jobs, total_reviews, is_available, service_areas, skills, equipment_provided, profile_verified')
        .eq('user_id', user.id)
        .single();
      
      additionalData.cleanerProfile = cleanerProfile;
    }

    // Get user addresses
    const { data: addresses } = await supabase
      .from('user_addresses')
      .select('id, label, full_address, city, postal_code, is_main')
      .eq('user_id', user.id)
      .order('is_main', { ascending: false });

    // Get payment methods
    const { data: paymentMethods } = await supabase
      .from('payment_methods')
      .select('id, type, provider, account_number, account_name, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);

    sendSuccess(res, {
      user: {
        ...user,
        ...additionalData
      },
      addresses: addresses || [],
      paymentMethods: paymentMethods || []
    }, 'Profil berhasil diambil');

  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    // Validate input
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return sendValidationError(res, error);
    }

    const { fullName, dateOfBirth, profilePictureUrl } = value;
    const userId = req.user.id;

    // Update user
    const updateData = {};
    if (fullName) updateData.full_name = fullName;
    if (dateOfBirth) updateData.date_of_birth = dateOfBirth;
    if (profilePictureUrl) updateData.profile_picture_url = profilePictureUrl;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, phone, full_name, user_type, date_of_birth, profile_picture_url, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return sendError(res, 'Gagal mengupdate profil', 500);
    }

    sendSuccess(res, {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        fullName: updatedUser.full_name,
        userType: updatedUser.user_type,
        dateOfBirth: updatedUser.date_of_birth,
        profilePictureUrl: updatedUser.profile_picture_url,
        updatedAt: updatedUser.updated_at
      }
    }, 'Profil berhasil diupdate');

  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    // Validate input
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return sendValidationError(res, error);
    }

    const { currentPassword, newPassword } = value;
    const userId = req.user.id;

    // Get current user with password
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (findError || !user) {
      return sendNotFound(res, 'User tidak ditemukan');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return sendUnauthorized(res, 'Password saat ini salah');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return sendError(res, 'Gagal mengubah password', 500);
    }

    sendSuccess(res, null, 'Password berhasil diubah');

  } catch (error) {
    console.error('Change password error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  try {
    // Validate input
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      return sendValidationError(res, error);
    }

    const { refreshToken: token } = value;

    // Verify refresh token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return sendUnauthorized(res, 'Invalid refresh token');
    }

    // Get user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, phone, full_name, user_type, status')
      .eq('id', decoded.userId)
      .single();

    if (findError || !user || user.status !== 'active') {
      return sendUnauthorized(res, 'Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    sendSuccess(res, {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    }, 'Token berhasil direfresh');

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Invalid refresh token');
    }
    
    console.error('Refresh token error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Logout user (optional - client should just discard tokens)
 */
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // But we can log the logout event or blacklist the token if needed
    
    sendSuccess(res, null, 'Logout berhasil');
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout
};