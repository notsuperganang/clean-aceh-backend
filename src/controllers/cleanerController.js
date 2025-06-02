const { supabase } = require('../config/database');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendPaginated,
  createPagination,
  sendUnauthorized
} = require('../utils/response');

/**
 * Get all cleaners with filters, search, and pagination
 */
const getCleaners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      minRating,
      maxPrice,
      sortBy = 'rating',
      sortOrder = 'desc',
      isAvailable,
      skills
    } = req.query;

    const pagination = createPagination({ page, limit });

    // Build query with joins
    let query = supabase
      .from('cleaner_profiles')
      .select(`
        *,
        users!inner(id, full_name, profile_picture_url, phone, email, status),
        cleaner_schedules(day_of_week, start_time, end_time, is_available)
      `, { count: 'exact' });

    // Filter by active users only
    query = query.eq('users.status', 'active');

    // Filter by availability
    if (isAvailable !== undefined) {
      query = query.eq('is_available', isAvailable);
    }

    // Search by name
    if (search) {
      query = query.ilike('users.full_name', `%${search}%`);
    }

    // Filter by service areas (city)
    if (city) {
      query = query.contains('service_areas', [city]);
    }

    // Filter by minimum rating
    if (minRating) {
      query = query.gte('rating', minRating);
    }

    // Filter by maximum hourly rate
    if (maxPrice) {
      query = query.lte('hourly_rate', maxPrice);
    }

    // Filter by skills
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      query = query.overlaps('skills', skillsArray);
    }

    // Sorting
    const ascending = sortOrder === 'asc';
    if (sortBy === 'name') {
      query = query.order('full_name', { ascending, foreignTable: 'users' });
    } else {
      query = query.order(sortBy, { ascending });
    }

    // Pagination
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);

    const { data: cleaners, error, count } = await query;

    if (error) {
      console.error('Error fetching cleaners:', error);
      return sendError(res, 'Gagal mengambil data pembersih', 500);
    }

    // Format response
    const formattedCleaners = cleaners.map(cleaner => ({
      id: cleaner.id,
      userId: cleaner.user_id,
      name: cleaner.users.full_name,
      profilePicture: cleaner.users.profile_picture_url,
      phone: cleaner.users.phone,
      bio: cleaner.bio,
      experienceYears: cleaner.experience_years,
      hourlyRate: cleaner.hourly_rate,
      rating: cleaner.rating,
      totalJobs: cleaner.total_jobs,
      totalReviews: cleaner.total_reviews,
      isAvailable: cleaner.is_available,
      serviceAreas: cleaner.service_areas,
      skills: cleaner.skills,
      equipmentProvided: cleaner.equipment_provided,
      profileVerified: cleaner.profile_verified,
      schedules: cleaner.cleaner_schedules || [],
      createdAt: cleaner.created_at
    }));

    return sendPaginated(
      res,
      formattedCleaners,
      {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0
      },
      'Data pembersih berhasil diambil'
    );

  } catch (error) {
    console.error('Get cleaners error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get cleaner by ID with detailed information
 */
const getCleanerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: cleaner, error } = await supabase
      .from('cleaner_profiles')
      .select(`
        *,
        users!inner(id, full_name, profile_picture_url, phone, email, status, created_at),
        cleaner_schedules(day_of_week, start_time, end_time, is_available),
        reviews(
          id, rating, comment, created_at,
          users!reviews_customer_id_fkey(full_name)
        )
      `)
      .eq('id', id)
      .eq('users.status', 'active')
      .single();

    if (error || !cleaner) {
      return sendNotFound(res, 'Pembersih tidak ditemukan');
    }

    // Calculate average rating from reviews if needed
    const reviews = cleaner.reviews || [];
    let calculatedRating = cleaner.rating;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      calculatedRating = totalRating / reviews.length;
    }

    // Format schedules by day
    const schedules = {};
    if (cleaner.cleaner_schedules) {
      cleaner.cleaner_schedules.forEach(schedule => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[schedule.day_of_week];
        schedules[dayName] = {
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          isAvailable: schedule.is_available
        };
      });
    }

    // Format response
    const formattedCleaner = {
      id: cleaner.id,
      userId: cleaner.user_id,
      name: cleaner.users.full_name,
      profilePicture: cleaner.users.profile_picture_url,
      phone: cleaner.users.phone,
      email: cleaner.users.email,
      bio: cleaner.bio,
      experienceYears: cleaner.experience_years,
      hourlyRate: cleaner.hourly_rate,
      rating: calculatedRating,
      totalJobs: cleaner.total_jobs,
      totalReviews: cleaner.total_reviews,
      isAvailable: cleaner.is_available,
      serviceAreas: cleaner.service_areas,
      skills: cleaner.skills,
      equipmentProvided: cleaner.equipment_provided,
      profileVerified: cleaner.profile_verified,
      schedules,
      recentReviews: reviews.slice(0, 5).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        customerName: review.users?.full_name || 'Anonymous',
        createdAt: review.created_at
      })),
      memberSince: cleaner.users.created_at,
      createdAt: cleaner.created_at
    };

    sendSuccess(res, formattedCleaner, 'Detail pembersih berhasil diambil');

  } catch (error) {
    console.error('Get cleaner by ID error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Update cleaner profile (Cleaner only)
 */
const updateCleanerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bio,
      experienceYears,
      hourlyRate,
      serviceAreas,
      skills,
      equipmentProvided
    } = req.body;

    // Get cleaner profile
    const { data: cleanerProfile, error: findError } = await supabase
      .from('cleaner_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (findError || !cleanerProfile) {
      return sendNotFound(res, 'Profil pembersih tidak ditemukan');
    }

    // Prepare update data
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (experienceYears !== undefined) updateData.experience_years = experienceYears;
    if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate;
    if (serviceAreas !== undefined) updateData.service_areas = serviceAreas;
    if (skills !== undefined) updateData.skills = skills;
    if (equipmentProvided !== undefined) updateData.equipment_provided = equipmentProvided;

    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('cleaner_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select(`
        *,
        users!inner(full_name, profile_picture_url, phone, email)
      `)
      .single();

    if (error) {
      console.error('Error updating cleaner profile:', error);
      return sendError(res, 'Gagal mengupdate profil', 500);
    }

    // Format response
    const formattedProfile = {
      id: updatedProfile.id,
      userId: updatedProfile.user_id,
      name: updatedProfile.users.full_name,
      profilePicture: updatedProfile.users.profile_picture_url,
      phone: updatedProfile.users.phone,
      email: updatedProfile.users.email,
      bio: updatedProfile.bio,
      experienceYears: updatedProfile.experience_years,
      hourlyRate: updatedProfile.hourly_rate,
      rating: updatedProfile.rating,
      totalJobs: updatedProfile.total_jobs,
      totalReviews: updatedProfile.total_reviews,
      isAvailable: updatedProfile.is_available,
      serviceAreas: updatedProfile.service_areas,
      skills: updatedProfile.skills,
      equipmentProvided: updatedProfile.equipment_provided,
      profileVerified: updatedProfile.profile_verified,
      updatedAt: updatedProfile.updated_at
    };

    sendSuccess(res, formattedProfile, 'Profil berhasil diupdate');

  } catch (error) {
    console.error('Update cleaner profile error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Update cleaner availability status
 */
const updateCleanerAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isAvailable } = req.body;

    // Update availability
    const { data: updatedProfile, error } = await supabase
      .from('cleaner_profiles')
      .update({ is_available: isAvailable })
      .eq('user_id', userId)
      .select('id, is_available')
      .single();

    if (error) {
      console.error('Error updating availability:', error);
      return sendError(res, 'Gagal mengupdate ketersediaan', 500);
    }

    if (!updatedProfile) {
      return sendNotFound(res, 'Profil pembersih tidak ditemukan');
    }

    sendSuccess(res, {
      isAvailable: updatedProfile.is_available
    }, `Status ketersediaan berhasil diubah menjadi ${isAvailable ? 'tersedia' : 'tidak tersedia'}`);

  } catch (error) {
    console.error('Update availability error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get cleaner schedules
 */
const getCleanerSchedules = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get cleaner profile first
    const { data: cleanerProfile, error: profileError } = await supabase
      .from('cleaner_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !cleanerProfile) {
      return sendNotFound(res, 'Profil pembersih tidak ditemukan');
    }

    // Get schedules
    const { data: schedules, error } = await supabase
      .from('cleaner_schedules')
      .select('*')
      .eq('cleaner_id', cleanerProfile.id)
      .order('day_of_week');

    if (error) {
      console.error('Error fetching schedules:', error);
      return sendError(res, 'Gagal mengambil jadwal', 500);
    }

    // Format schedules
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.day_of_week,
      dayName: dayNames[schedule.day_of_week],
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      isAvailable: schedule.is_available,
      createdAt: schedule.created_at
    }));

    sendSuccess(res, formattedSchedules, 'Jadwal berhasil diambil');

  } catch (error) {
    console.error('Get schedules error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Update cleaner schedules
 */
const updateCleanerSchedules = async (req, res) => {
  try {
    const userId = req.user.id;
    const { schedules } = req.body; // Array of schedule objects

    // Get cleaner profile first
    const { data: cleanerProfile, error: profileError } = await supabase
      .from('cleaner_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !cleanerProfile) {
      return sendNotFound(res, 'Profil pembersih tidak ditemukan');
    }

    // Delete existing schedules
    const { error: deleteError } = await supabase
      .from('cleaner_schedules')
      .delete()
      .eq('cleaner_id', cleanerProfile.id);

    if (deleteError) {
      console.error('Error deleting schedules:', deleteError);
      return sendError(res, 'Gagal mengupdate jadwal', 500);
    }

    // Insert new schedules
    if (schedules && schedules.length > 0) {
      const schedulesToInsert = schedules.map(schedule => ({
        cleaner_id: cleanerProfile.id,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
        is_available: schedule.isAvailable
      }));

      const { data: newSchedules, error: insertError } = await supabase
        .from('cleaner_schedules')
        .insert(schedulesToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting schedules:', insertError);
        return sendError(res, 'Gagal mengupdate jadwal', 500);
      }

      // Format response
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formattedSchedules = newSchedules.map(schedule => ({
        id: schedule.id,
        dayOfWeek: schedule.day_of_week,
        dayName: dayNames[schedule.day_of_week],
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        isAvailable: schedule.is_available,
        createdAt: schedule.created_at
      }));

      sendSuccess(res, formattedSchedules, 'Jadwal berhasil diupdate');
    } else {
      sendSuccess(res, [], 'Jadwal berhasil dihapus');
    }

  } catch (error) {
    console.error('Update schedules error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get cleaner statistics (for cleaner dashboard)
 */
const getCleanerStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get cleaner profile
    const { data: cleanerProfile, error: profileError } = await supabase
      .from('cleaner_profiles')
      .select('id, total_jobs, total_reviews, rating')
      .eq('user_id', userId)
      .single();

    if (profileError || !cleanerProfile) {
      return sendNotFound(res, 'Profil pembersih tidak ditemukan');
    }

    // Get recent orders
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, service_date, total_price, created_at')
      .eq('cleaner_id', cleanerProfile.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.error('Error fetching recent orders:', ordersError);
    }

    // Get monthly earnings (current month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    const firstDayOfMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const firstDayOfNextMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    
    const { data: monthlyOrders, error: monthlyError } = await supabase
      .from('orders')
      .select('total_price')
      .eq('cleaner_id', cleanerProfile.id)
      .eq('status', 'completed')
      .gte('service_date', firstDayOfMonth)
      .lt('service_date', firstDayOfNextMonth);

    if (monthlyError) {
      console.error('Error fetching monthly orders:', monthlyError);
    }

    const monthlyEarnings = monthlyOrders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;

    // Get pending orders count
    const { count: pendingOrdersCount, error: pendingError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('cleaner_id', cleanerProfile.id)
      .in('status', ['pending', 'confirmed']);

    if (pendingError) {
      console.error('Error fetching pending orders:', pendingError);
    }

    const stats = {
      totalJobs: cleanerProfile.total_jobs || 0,
      totalReviews: cleanerProfile.total_reviews || 0,
      rating: cleanerProfile.rating || 0,
      monthlyEarnings: monthlyEarnings,
      pendingOrders: pendingOrdersCount || 0,
      recentOrders: recentOrders?.map(order => ({
        id: order.id,
        status: order.status,
        serviceDate: order.service_date,
        totalPrice: order.total_price,
        createdAt: order.created_at
      })) || []
    };

    sendSuccess(res, stats, 'Statistik berhasil diambil');

  } catch (error) {
    console.error('Get cleaner stats error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Search cleaners with advanced filters
 */
const searchCleaners = async (req, res) => {
  try {
    const {
      query: searchQuery,
      latitude,
      longitude,
      radius = 10, // km
      serviceDate,
      serviceTime,
      minRating = 0,
      maxPrice,
      skills,
      sortBy = 'rating'
    } = req.query;

    let query = supabase
      .from('cleaner_profiles')
      .select(`
        *,
        users!inner(id, full_name, profile_picture_url, phone, status),
        cleaner_schedules(day_of_week, start_time, end_time, is_available)
      `);

    // Filter by active users and available cleaners
    query = query.eq('users.status', 'active').eq('is_available', true);

    // Search by name or skills  
    if (searchQuery) {
      // Use separate filters instead of complex OR to avoid PostgREST syntax issues
      query = query.ilike('users.full_name', `%${searchQuery}%`);
    }

    // Filter by minimum rating
    if (minRating) {
      query = query.gte('rating', minRating);
    }

    // Filter by maximum price
    if (maxPrice) {
      query = query.lte('hourly_rate', maxPrice);
    }

    // Filter by skills
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      query = query.overlaps('skills', skillsArray);
    }

    // Execute query
    const { data: cleaners, error } = await query;

    if (error) {
      console.error('Error searching cleaners:', error);
      return sendError(res, 'Gagal mencari pembersih', 500);
    }

    // Post-process results
    let filteredCleaners = cleaners;

    // Filter by availability on specific date/time if provided
    if (serviceDate && serviceTime) {
      const serviceDay = new Date(serviceDate).getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      filteredCleaners = cleaners.filter(cleaner => {
        const daySchedule = cleaner.cleaner_schedules?.find(
          schedule => schedule.day_of_week === serviceDay && schedule.is_available
        );
        
        if (!daySchedule) return false;
        
        // Simple time check (you might want to make this more sophisticated)
        const serviceTimeNum = parseInt(serviceTime.replace(':', ''));
        const startTimeNum = parseInt(daySchedule.start_time.replace(':', ''));
        const endTimeNum = parseInt(daySchedule.end_time.replace(':', ''));
        
        return serviceTimeNum >= startTimeNum && serviceTimeNum <= endTimeNum;
      });
    }

    // TODO: Add location-based filtering using latitude, longitude, and radius
    // This would require adding latitude/longitude to cleaner_profiles or implementing PostGIS

    // Sort results
    if (sortBy === 'distance' && latitude && longitude) {
      // TODO: Implement distance-based sorting
    } else if (sortBy === 'rating') {
      filteredCleaners.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price') {
      filteredCleaners.sort((a, b) => a.hourly_rate - b.hourly_rate);
    }

    // Format response
    const formattedCleaners = filteredCleaners.map(cleaner => ({
      id: cleaner.id,
      userId: cleaner.user_id,
      name: cleaner.users.full_name,
      profilePicture: cleaner.users.profile_picture_url,
      rating: cleaner.rating,
      totalJobs: cleaner.total_jobs,
      hourlyRate: cleaner.hourly_rate,
      serviceAreas: cleaner.service_areas,
      skills: cleaner.skills,
      equipmentProvided: cleaner.equipment_provided,
      profileVerified: cleaner.profile_verified,
      // TODO: Add distance if location is provided
      distance: null
    }));

    sendSuccess(res, formattedCleaners, 'Pencarian pembersih berhasil');

  } catch (error) {
    console.error('Search cleaners error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

module.exports = {
  getCleaners,
  getCleanerById,
  updateCleanerProfile,
  updateCleanerAvailability,
  getCleanerSchedules,
  updateCleanerSchedules,
  getCleanerStats,
  searchCleaners
};