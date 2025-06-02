const { supabase } = require('../config/database');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendPaginated,
  createPagination,
  sendUnauthorized,
  sendConflict
} = require('../utils/response');

/**
 * Generate unique order number
 */
const generateOrderNumber = () => {
  const prefix = 'CA';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

/**
 * Create new order
 */
const createOrder = async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      cleanerId,
      serviceId,
      serviceDate,
      startTime,
      endTime,
      addressId,
      serviceAddress,
      basePrice,
      additionalServices = [],
      additionalServicesPrice = 0,
      platformFee = 10000,
      taxAmount,
      totalPrice,
      specialInstructions
    } = req.body;

    // Validate service date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (serviceDate < today) {
      return sendError(res, 'Tanggal layanan tidak boleh di masa lalu', 400);
    }

    // Check if cleaner exists and is available
    const { data: cleanerProfile, error: cleanerError } = await supabase
      .from('cleaner_profiles')
      .select(`
        id, 
        user_id, 
        is_available,
        users!inner(status)
      `)
      .eq('id', cleanerId)
      .single();

    if (cleanerError || !cleanerProfile) {
      return sendNotFound(res, 'Pembersih tidak ditemukan');
    }

    if (cleanerProfile.users.status !== 'active') {
      return sendError(res, 'Pembersih sedang tidak aktif', 400);
    }

    if (!cleanerProfile.is_available) {
      return sendError(res, 'Pembersih sedang tidak tersedia', 400);
    }

    // Check if service exists
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, is_active')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return sendNotFound(res, 'Layanan tidak ditemukan');
    }

    if (!service.is_active) {
      return sendError(res, 'Layanan sedang tidak tersedia', 400);
    }

    // Check address belongs to customer if addressId provided
    if (addressId) {
      const { data: address, error: addressError } = await supabase
        .from('user_addresses')
        .select('id, full_address')
        .eq('id', addressId)
        .eq('user_id', customerId)
        .single();

      if (addressError || !address) {
        return sendError(res, 'Alamat tidak valid', 400);
      }
    }

    // Calculate tax if not provided (PPN 11%)
    const calculatedTax = taxAmount || Math.round((basePrice + additionalServicesPrice) * 0.11);
    const calculatedTotal = basePrice + additionalServicesPrice + platformFee + calculatedTax;

    // Validate total price
    if (Math.abs(totalPrice - calculatedTotal) > 100) { // Allow small rounding differences
      return sendError(res, 'Total harga tidak sesuai dengan perhitungan', 400);
    }

    // Check cleaner availability for the specific date/time
    const requestedDay = new Date(serviceDate).getDay(); // 0 = Sunday, 1 = Monday, etc.
    const { data: schedules } = await supabase
      .from('cleaner_schedules')
      .select('*')
      .eq('cleaner_id', cleanerId)
      .eq('day_of_week', requestedDay)
      .eq('is_available', true);

    if (!schedules || schedules.length === 0) {
      return sendError(res, 'Pembersih tidak tersedia pada hari yang diminta', 400);
    }

    // Check if requested time is within schedule
    const schedule = schedules[0];
    const requestedStartTime = startTime.replace(':', '');
    const scheduleStartTime = schedule.start_time.replace(':', '');
    const scheduleEndTime = schedule.end_time.replace(':', '');

    if (requestedStartTime < scheduleStartTime || requestedStartTime > scheduleEndTime) {
      return sendError(res, 'Waktu yang diminta di luar jadwal pembersih', 400);
    }

    // Check for conflicting orders on the same date/time
    const { data: conflictingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('cleaner_id', cleanerId)
      .eq('service_date', serviceDate)
      .in('status', ['pending', 'confirmed', 'on_the_way', 'in_progress'])
      .overlaps('start_time', startTime); // This needs custom logic

    // Simple conflict check - if cleaner has any order on same date, reject
    if (conflictingOrders && conflictingOrders.length > 0) {
      return sendError(res, 'Pembersih sudah memiliki pesanan pada waktu tersebut', 409);
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const orderData = {
      order_number: orderNumber,
      customer_id: customerId,
      cleaner_id: cleanerId,
      service_id: serviceId,
      status: 'pending',
      service_date: serviceDate,
      start_time: startTime,
      end_time: endTime,
      address_id: addressId,
      service_address: serviceAddress,
      base_price: basePrice,
      additional_services_price: additionalServicesPrice,
      platform_fee: platformFee,
      tax_amount: calculatedTax,
      total_price: totalPrice,
      special_instructions: specialInstructions,
      additional_services: additionalServices
    };

    const { data: newOrder, error: createError } = await supabase
      .from('orders')
      .insert(orderData)
      .select(`
        *,
        services(name, description),
        cleaner_profiles(
          users(full_name, phone)
        ),
        user_addresses(label, full_address, city)
      `)
      .single();

    if (createError) {
      console.error('Error creating order:', createError);
      return sendError(res, 'Gagal membuat pesanan', 500);
    }

    // Create order status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: newOrder.id,
        new_status: 'pending',
        changed_by: customerId,
        notes: 'Pesanan dibuat'
      });

    // Create notification for cleaner (TODO: implement notification system)
    await supabase
      .from('notifications')
      .insert({
        user_id: cleanerProfile.user_id,
        title: 'Pesanan Baru',
        message: `Anda mendapat pesanan baru untuk ${service.name} pada ${serviceDate}`,
        type: 'order',
        related_id: newOrder.id
      });

    // Format response
    const formattedOrder = {
      id: newOrder.id,
      orderNumber: newOrder.order_number,
      status: newOrder.status,
      service: {
        id: newOrder.service_id,
        name: newOrder.services.name,
        description: newOrder.services.description
      },
      cleaner: {
        id: newOrder.cleaner_id,
        name: newOrder.cleaner_profiles.users.full_name,
        phone: newOrder.cleaner_profiles.users.phone
      },
      serviceDate: newOrder.service_date,
      startTime: newOrder.start_time,
      endTime: newOrder.end_time,
      address: newOrder.user_addresses ? {
        label: newOrder.user_addresses.label,
        fullAddress: newOrder.user_addresses.full_address,
        city: newOrder.user_addresses.city
      } : null,
      serviceAddress: newOrder.service_address,
      pricing: {
        basePrice: newOrder.base_price,
        additionalServicesPrice: newOrder.additional_services_price,
        platformFee: newOrder.platform_fee,
        taxAmount: newOrder.tax_amount,
        totalPrice: newOrder.total_price
      },
      additionalServices: newOrder.additional_services,
      specialInstructions: newOrder.special_instructions,
      createdAt: newOrder.created_at
    };

    sendSuccess(res, formattedOrder, 'Pesanan berhasil dibuat', 201);

  } catch (error) {
    console.error('Create order error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get orders for current user (customer or cleaner)
 */
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const pagination = createPagination({ page, limit });

    let query = supabase
      .from('orders')
      .select(`
        *,
        services(name, description, category),
        cleaner_profiles(
          id,
          users(full_name, phone, profile_picture_url)
        ),
        users!orders_customer_id_fkey(full_name, phone, profile_picture_url),
        user_addresses(label, full_address, city)
      `, { count: 'exact' });

    // Filter by user type and ID
    if (userType === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (userType === 'cleaner') {
      // Get cleaner profile ID first
      const { data: cleanerProfile } = await supabase
        .from('cleaner_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!cleanerProfile) {
        return sendError(res, 'Profil pembersih tidak ditemukan', 404);
      }

      query = query.eq('cleaner_id', cleanerProfile.id);
    }

    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    // Sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Pagination
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching user orders:', error);
      return sendError(res, 'Gagal mengambil data pesanan', 500);
    }

    // Format response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      service: {
        id: order.service_id,
        name: order.services.name,
        description: order.services.description,
        category: order.services.category
      },
      cleaner: userType === 'customer' ? {
        id: order.cleaner_id,
        name: order.cleaner_profiles?.users?.full_name,
        phone: order.cleaner_profiles?.users?.phone,
        profilePicture: order.cleaner_profiles?.users?.profile_picture_url
      } : null,
      customer: userType === 'cleaner' ? {
        id: order.customer_id,
        name: order.users?.full_name,
        phone: order.users?.phone,
        profilePicture: order.users?.profile_picture_url
      } : null,
      serviceDate: order.service_date,
      startTime: order.start_time,
      endTime: order.end_time,
      address: order.user_addresses ? {
        label: order.user_addresses.label,
        fullAddress: order.user_addresses.full_address,
        city: order.user_addresses.city
      } : null,
      serviceAddress: order.service_address,
      totalPrice: order.total_price,
      createdAt: order.created_at,
      confirmedAt: order.confirmed_at,
      startedAt: order.started_at,
      completedAt: order.completed_at,
      cancelledAt: order.cancelled_at
    }));

    return sendPaginated(
      res,
      formattedOrders,
      {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0
      },
      'Data pesanan berhasil diambil'
    );

  } catch (error) {
    console.error('Get user orders error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.user_type;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        services(name, description, category, base_price),
        cleaner_profiles(
          id,
          users(full_name, phone, profile_picture_url, email)
        ),
        users!orders_customer_id_fkey(full_name, phone, profile_picture_url, email),
        user_addresses(label, full_address, city, postal_code),
        order_status_history(
          old_status, 
          new_status, 
          notes, 
          created_at,
          users(full_name)
        ),
        payments(id, amount, status, payment_reference, paid_at)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return sendNotFound(res, 'Pesanan tidak ditemukan');
    }

    // Check access permission
    let hasAccess = false;
    if (userType === 'customer' && order.customer_id === userId) {
      hasAccess = true;
    } else if (userType === 'cleaner' && order.cleaner_profiles?.users) {
      // Get cleaner profile to check
      const { data: cleanerProfile } = await supabase
        .from('cleaner_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (cleanerProfile && order.cleaner_id === cleanerProfile.id) {
        hasAccess = true;
      }
    } else if (userType === 'admin') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return sendError(res, 'Anda tidak memiliki akses ke pesanan ini', 403);
    }

    // Format response
    const formattedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      service: {
        id: order.service_id,
        name: order.services.name,
        description: order.services.description,
        category: order.services.category,
        basePrice: order.services.base_price
      },
      cleaner: {
        id: order.cleaner_id,
        name: order.cleaner_profiles?.users?.full_name,
        phone: order.cleaner_profiles?.users?.phone,
        email: order.cleaner_profiles?.users?.email,
        profilePicture: order.cleaner_profiles?.users?.profile_picture_url
      },
      customer: {
        id: order.customer_id,
        name: order.users?.full_name,
        phone: order.users?.phone,
        email: order.users?.email,
        profilePicture: order.users?.profile_picture_url
      },
      serviceDate: order.service_date,
      startTime: order.start_time,
      endTime: order.end_time,
      estimatedDuration: order.estimated_duration,
      address: order.user_addresses ? {
        label: order.user_addresses.label,
        fullAddress: order.user_addresses.full_address,
        city: order.user_addresses.city,
        postalCode: order.user_addresses.postal_code
      } : null,
      serviceAddress: order.service_address,
      pricing: {
        basePrice: order.base_price,
        additionalServicesPrice: order.additional_services_price,
        platformFee: order.platform_fee,
        taxAmount: order.tax_amount,
        totalPrice: order.total_price
      },
      additionalServices: order.additional_services,
      specialInstructions: order.special_instructions,
      statusHistory: order.order_status_history?.map(history => ({
        oldStatus: history.old_status,
        newStatus: history.new_status,
        notes: history.notes,
        changedBy: history.users?.full_name,
        createdAt: history.created_at
      })) || [],
      payments: order.payments?.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        reference: payment.payment_reference,
        paidAt: payment.paid_at
      })) || [],
      timestamps: {
        createdAt: order.created_at,
        confirmedAt: order.confirmed_at,
        startedAt: order.started_at,
        completedAt: order.completed_at,
        cancelledAt: order.cancelled_at
      }
    };

    sendSuccess(res, formattedOrder, 'Detail pesanan berhasil diambil');

  } catch (error) {
    console.error('Get order by ID error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    const userType = req.user.user_type;

    // Get current order
    const { data: currentOrder, error: findError } = await supabase
      .from('orders')
      .select(`
        *,
        cleaner_profiles(user_id)
      `)
      .eq('id', id)
      .single();

    if (findError || !currentOrder) {
      return sendNotFound(res, 'Pesanan tidak ditemukan');
    }

    // Check permission to update status
    let canUpdate = false;
    if (userType === 'admin') {
      canUpdate = true;
    } else if (userType === 'customer' && currentOrder.customer_id === userId) {
      // Customers can only cancel
      canUpdate = status === 'cancelled' && ['pending', 'confirmed'].includes(currentOrder.status);
    } else if (userType === 'cleaner' && currentOrder.cleaner_profiles?.user_id === userId) {
      // Cleaners can update most statuses
      canUpdate = true;
    }

    if (!canUpdate) {
      return sendError(res, 'Anda tidak memiliki izin untuk mengubah status pesanan ini', 403);
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['on_the_way', 'cancelled'],
      'on_the_way': ['in_progress', 'cancelled'],
      'in_progress': ['completed'],
      'completed': [], // No transitions from completed
      'cancelled': [] // No transitions from cancelled
    };

    if (!validTransitions[currentOrder.status]?.includes(status)) {
      return sendError(res, `Status tidak dapat diubah dari ${currentOrder.status} ke ${status}`, 400);
    }

    // Prepare update data
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add timestamp for specific statuses
    switch (status) {
      case 'confirmed':
        updateData.confirmed_at = new Date().toISOString();
        break;
      case 'in_progress':
        updateData.started_at = new Date().toISOString();
        break;
      case 'completed':
        updateData.completed_at = new Date().toISOString();
        break;
      case 'cancelled':
        updateData.cancelled_at = new Date().toISOString();
        break;
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return sendError(res, 'Gagal mengubah status pesanan', 500);
    }

    // Create status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        old_status: currentOrder.status,
        new_status: status,
        changed_by: userId,
        notes: notes || `Status diubah ke ${status}`
      });

    // Create notification for the other party
    let notificationUserId = null;
    let notificationMessage = '';

    if (userType === 'cleaner') {
      notificationUserId = currentOrder.customer_id;
      notificationMessage = `Status pesanan Anda diubah menjadi ${status}`;
    } else if (userType === 'customer') {
      notificationUserId = currentOrder.cleaner_profiles?.user_id;
      notificationMessage = `Customer mengubah status pesanan menjadi ${status}`;
    }

    if (notificationUserId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: notificationUserId,
          title: 'Update Status Pesanan',
          message: notificationMessage,
          type: 'order',
          related_id: id
        });
    }

    // Update cleaner stats if order completed
    if (status === 'completed' && userType === 'cleaner') {
      await supabase.rpc('increment_cleaner_stats', {
        cleaner_id: currentOrder.cleaner_id
      });
    }

    sendSuccess(res, {
      id: updatedOrder.id,
      status: updatedOrder.status,
      updatedAt: updatedOrder.updated_at,
      timestamps: {
        confirmedAt: updatedOrder.confirmed_at,
        startedAt: updatedOrder.started_at,
        completedAt: updatedOrder.completed_at,
        cancelledAt: updatedOrder.cancelled_at
      }
    }, `Status pesanan berhasil diubah menjadi ${status}`);

  } catch (error) {
    console.error('Update order status error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Cancel order
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userType = req.user.user_type;

    // Get current order
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select(`
        *,
        cleaner_profiles(user_id)
      `)
      .eq('id', id)
      .single();

    if (findError || !order) {
      return sendNotFound(res, 'Pesanan tidak ditemukan');
    }

    // Check permission
    let canCancel = false;
    if (userType === 'admin') {
      canCancel = true;
    } else if (userType === 'customer' && order.customer_id === userId) {
      canCancel = ['pending', 'confirmed'].includes(order.status);
    } else if (userType === 'cleaner' && order.cleaner_profiles?.user_id === userId) {
      canCancel = ['pending', 'confirmed', 'on_the_way'].includes(order.status);
    }

    if (!canCancel) {
      return sendError(res, 'Pesanan tidak dapat dibatalkan pada status ini', 400);
    }

    if (order.status === 'cancelled') {
      return sendError(res, 'Pesanan sudah dibatalkan sebelumnya', 400);
    }

    // Calculate cancellation fee if needed
    let cancellationFee = 0;
    const now = new Date();
    const serviceDateTime = new Date(`${order.service_date}T${order.start_time}`);
    const hoursUntilService = (serviceDateTime - now) / (1000 * 60 * 60);

    // Apply cancellation fee if less than 12 hours before service
    if (hoursUntilService < 12 && hoursUntilService > 0) {
      cancellationFee = Math.round(order.total_price * 0.25); // 25% fee
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error cancelling order:', updateError);
      return sendError(res, 'Gagal membatalkan pesanan', 500);
    }

    // Create status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        old_status: order.status,
        new_status: 'cancelled',
        changed_by: userId,
        notes: reason || 'Pesanan dibatalkan'
      });

    // Create notification for the other party
    const otherUserId = userType === 'customer' 
      ? order.cleaner_profiles?.user_id 
      : order.customer_id;

    if (otherUserId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: otherUserId,
          title: 'Pesanan Dibatalkan',
          message: `Pesanan #${order.order_number} telah dibatalkan`,
          type: 'order',
          related_id: id
        });
    }

    sendSuccess(res, {
      id: order.id,
      status: 'cancelled',
      cancellationFee,
      reason: reason || 'Pesanan dibatalkan'
    }, 'Pesanan berhasil dibatalkan');

  } catch (error) {
    console.error('Cancel order error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get order statistics for dashboard
 */
const getOrderStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    let whereClause = {};
    
    if (userType === 'customer') {
      whereClause.customer_id = userId;
    } else if (userType === 'cleaner') {
      // Get cleaner profile
      const { data: cleanerProfile } = await supabase
        .from('cleaner_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!cleanerProfile) {
        return sendError(res, 'Profil pembersih tidak ditemukan', 404);
      }

      whereClause.cleaner_id = cleanerProfile.id;
    }

    // Get order counts by status
    const { data: statusCounts } = await supabase
      .from('orders')
      .select('status')
      .match(whereClause);

    const stats = {
      total: statusCounts?.length || 0,
      pending: statusCounts?.filter(o => o.status === 'pending').length || 0,
      confirmed: statusCounts?.filter(o => o.status === 'confirmed').length || 0,
      inProgress: statusCounts?.filter(o => o.status === 'in_progress').length || 0,
      completed: statusCounts?.filter(o => o.status === 'completed').length || 0,
      cancelled: statusCounts?.filter(o => o.status === 'cancelled').length || 0
    };

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, service_date, total_price, created_at,
        services(name)
      `)
      .match(whereClause)
      .order('created_at', { ascending: false })
      .limit(5);

    stats.recentOrders = recentOrders?.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      serviceName: order.services?.name,
      serviceDate: order.service_date,
      totalPrice: order.total_price,
      createdAt: order.created_at
    })) || [];

    sendSuccess(res, stats, 'Statistik pesanan berhasil diambil');

  } catch (error) {
    console.error('Get order stats error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};