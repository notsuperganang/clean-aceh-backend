const { supabase } = require('../config/database');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendPaginated,
  createPagination
} = require('../utils/response');

/**
 * Get all services with pagination, search, and filters
 */
const getServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = 'name',
      sortOrder = 'asc',
      isActive = true
    } = req.query;

    const pagination = createPagination({ page, limit });

    // Build query
    let query = supabase
      .from('services')
      .select('*', { count: 'exact' });

    // Filter by active status (default only active services for public)
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    // Search functionality
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Category filter
    if (category) {
      query = query.eq('category', category);
    }

    // Price range filter
    if (minPrice) {
      query = query.gte('base_price', minPrice);
    }
    if (maxPrice) {
      query = query.lte('base_price', maxPrice);
    }

    // Sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Pagination
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);

    const { data: services, error, count } = await query;

    if (error) {
      console.error('Error fetching services:', error);
      return sendError(res, 'Gagal mengambil data layanan', 500);
    }

    // Format response
    const formattedServices = services.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      basePrice: service.base_price,
      durationHours: service.duration_hours,
      category: service.category,
      isActive: service.is_active,
      createdAt: service.created_at,
      updatedAt: service.updated_at
    }));

    return sendPaginated(
      res,
      formattedServices,
      {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0
      },
      'Layanan berhasil diambil'
    );

  } catch (error) {
    console.error('Get services error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get service by ID
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !service) {
      return sendNotFound(res, 'Layanan tidak ditemukan');
    }

    // Format response
    const formattedService = {
      id: service.id,
      name: service.name,
      description: service.description,
      basePrice: service.base_price,
      durationHours: service.duration_hours,
      category: service.category,
      isActive: service.is_active,
      createdAt: service.created_at,
      updatedAt: service.updated_at
    };

    sendSuccess(res, formattedService, 'Detail layanan berhasil diambil');

  } catch (error) {
    console.error('Get service by ID error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Create new service (Admin only)
 */
const createService = async (req, res) => {
  try {
    const {
      name,
      description,
      basePrice,
      durationHours,
      category,
      isActive = true
    } = req.body;

    // Check if service name already exists
    // Use .maybeSingle() to avoid error when no data found
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('id, name')
      .eq('name', name)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing service:', checkError);
      return sendError(res, 'Gagal memeriksa layanan yang sudah ada', 500);
    }

    if (existingService) {
      return sendError(res, 'Nama layanan sudah ada', 409);
    }

    // Create service
    const { data: newService, error } = await supabase
      .from('services')
      .insert({
        name,
        description,
        base_price: basePrice,
        duration_hours: durationHours,
        category,
        is_active: isActive
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return sendError(res, 'Nama layanan sudah ada', 409);
      }
      
      return sendError(res, 'Gagal membuat layanan', 500);
    }

    // Format response
    const formattedService = {
      id: newService.id,
      name: newService.name,
      description: newService.description,
      basePrice: newService.base_price,
      durationHours: newService.duration_hours,
      category: newService.category,
      isActive: newService.is_active,
      createdAt: newService.created_at,
      updatedAt: newService.updated_at
    };

    sendSuccess(res, formattedService, 'Layanan berhasil dibuat', 201);

  } catch (error) {
    console.error('Create service error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Update service (Admin only)
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if service exists
    const { data: existingService, error: findError } = await supabase
      .from('services')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('Error finding service:', findError);
      return sendError(res, 'Gagal mencari layanan', 500);
    }

    if (!existingService) {
      return sendNotFound(res, 'Layanan tidak ditemukan');
    }

    // Check if new name already exists (if name is being updated)
    if (updateData.name && updateData.name !== existingService.name) {
      const { data: nameExists, error: nameCheckError } = await supabase
        .from('services')
        .select('id')
        .eq('name', updateData.name)
        .neq('id', id)
        .maybeSingle();

      if (nameCheckError) {
        console.error('Error checking duplicate name:', nameCheckError);
        return sendError(res, 'Gagal memeriksa nama layanan', 500);
      }

      if (nameExists) {
        return sendError(res, 'Nama layanan sudah ada', 409);
      }
    }

    // Prepare update data
    const serviceUpdateData = {};
    if (updateData.name) serviceUpdateData.name = updateData.name;
    if (updateData.description !== undefined) serviceUpdateData.description = updateData.description;
    if (updateData.basePrice) serviceUpdateData.base_price = updateData.basePrice;
    if (updateData.durationHours) serviceUpdateData.duration_hours = updateData.durationHours;
    if (updateData.category !== undefined) serviceUpdateData.category = updateData.category;
    if (updateData.isActive !== undefined) serviceUpdateData.is_active = updateData.isActive;

    // Update service
    const { data: updatedService, error } = await supabase
      .from('services')
      .update(serviceUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return sendError(res, 'Nama layanan sudah ada', 409);
      }
      
      return sendError(res, 'Gagal mengupdate layanan', 500);
    }

    // Format response
    const formattedService = {
      id: updatedService.id,
      name: updatedService.name,
      description: updatedService.description,
      basePrice: updatedService.base_price,
      durationHours: updatedService.duration_hours,
      category: updatedService.category,
      isActive: updatedService.is_active,
      createdAt: updatedService.created_at,
      updatedAt: updatedService.updated_at
    };

    sendSuccess(res, formattedService, 'Layanan berhasil diupdate');

  } catch (error) {
    console.error('Update service error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Delete service (Admin only)
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const { data: existingService, error: findError } = await supabase
      .from('services')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('Error finding service:', findError);
      return sendError(res, 'Gagal mencari layanan', 500);
    }

    if (!existingService) {
      return sendNotFound(res, 'Layanan tidak ditemukan');
    }

    // Check if service is being used in any orders
    const { data: ordersUsingService, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('service_id', id)
      .limit(1);

    if (ordersError) {
      console.error('Error checking orders:', ordersError);
      return sendError(res, 'Gagal memeriksa penggunaan layanan', 500);
    }

    if (ordersUsingService && ordersUsingService.length > 0) {
      return sendError(res, 'Layanan tidak dapat dihapus karena masih digunakan dalam pesanan', 400);
    }

    // Delete service
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      return sendError(res, 'Gagal menghapus layanan', 500);
    }

    sendSuccess(res, null, 'Layanan berhasil dihapus');

  } catch (error) {
    console.error('Delete service error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get service categories
 */
const getServiceCategories = async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('services')
      .select('category')
      .not('category', 'is', null)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching categories:', error);
      return sendError(res, 'Gagal mengambil kategori layanan', 500);
    }

    // Get unique categories with count
    const categoryCount = {};
    categories.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    const formattedCategories = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count
    }));

    sendSuccess(res, formattedCategories, 'Kategori layanan berhasil diambil');

  } catch (error) {
    console.error('Get categories error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get service statistics (Admin only)
 */
const getServiceStats = async (req, res) => {
  try {
    // Total services
    const { count: totalServices, error: totalError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error getting total services:', totalError);
      return sendError(res, 'Gagal mengambil statistik layanan', 500);
    }

    // Active services
    const { count: activeServices, error: activeError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeError) {
      console.error('Error getting active services:', activeError);
      return sendError(res, 'Gagal mengambil statistik layanan aktif', 500);
    }

    // Services by category
    const { data: categoryStats, error: categoryError } = await supabase
      .from('services')
      .select('category')
      .eq('is_active', true);

    if (categoryError) {
      console.error('Error getting category stats:', categoryError);
      return sendError(res, 'Gagal mengambil statistik kategori', 500);
    }

    const categoryCount = {};
    categoryStats.forEach(item => {
      const category = item.category || 'Uncategorized';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // Price range stats
    const { data: priceStats, error: priceError } = await supabase
      .from('services')
      .select('base_price')
      .eq('is_active', true);

    if (priceError) {
      console.error('Error getting price stats:', priceError);
      return sendError(res, 'Gagal mengambil statistik harga', 500);
    }

    const prices = priceStats.map(item => item.base_price).filter(price => price !== null);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const stats = {
      totalServices: totalServices || 0,
      activeServices: activeServices || 0,
      inactiveServices: (totalServices || 0) - (activeServices || 0),
      categoriesBreakdown: Object.entries(categoryCount).map(([name, count]) => ({
        category: name,
        count
      })),
      priceStats: {
        average: Math.round(avgPrice),
        minimum: minPrice,
        maximum: maxPrice,
        count: prices.length
      }
    };

    sendSuccess(res, stats, 'Statistik layanan berhasil diambil');

  } catch (error) {
    console.error('Get service stats error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceCategories,
  getServiceStats
};