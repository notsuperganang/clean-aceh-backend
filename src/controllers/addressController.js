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
 * Get user addresses with pagination
 */
const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      city
    } = req.query;

    const pagination = createPagination({ page, limit });

    let query = supabase
      .from('user_addresses')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Filter by city if provided
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Order by main address first, then by created date
    query = query.order('is_main', { ascending: false })
                 .order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);

    const { data: addresses, error, count } = await query;

    if (error) {
      console.error('Error fetching user addresses:', error);
      return sendError(res, 'Gagal mengambil data alamat', 500);
    }

    // Format response
    const formattedAddresses = addresses.map(address => ({
      id: address.id,
      label: address.label,
      fullAddress: address.full_address,
      city: address.city,
      postalCode: address.postal_code,
      latitude: address.latitude,
      longitude: address.longitude,
      isMain: address.is_main,
      createdAt: address.created_at,
      updatedAt: address.updated_at
    }));

    return sendPaginated(
      res,
      formattedAddresses,
      {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0
      },
      'Alamat berhasil diambil'
    );

  } catch (error) {
    console.error('Get user addresses error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get address by ID
 */
const getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: address, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !address) {
      return sendNotFound(res, 'Alamat tidak ditemukan');
    }

    // Format response
    const formattedAddress = {
      id: address.id,
      label: address.label,
      fullAddress: address.full_address,
      city: address.city,
      postalCode: address.postal_code,
      latitude: address.latitude,
      longitude: address.longitude,
      isMain: address.is_main,
      createdAt: address.created_at,
      updatedAt: address.updated_at
    };

    sendSuccess(res, formattedAddress, 'Detail alamat berhasil diambil');

  } catch (error) {
    console.error('Get address by ID error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Create new address
 */
const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      label,
      fullAddress,
      city,
      postalCode,
      latitude,
      longitude,
      isMain = false
    } = req.body;

    // Check if label already exists for this user
    const { data: existingAddress, error: checkError } = await supabase
      .from('user_addresses')
      .select('id, label')
      .eq('user_id', userId)
      .eq('label', label)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing address:', checkError);
      return sendError(res, 'Gagal memeriksa alamat yang sudah ada', 500);
    }

    if (existingAddress) {
      return sendError(res, 'Label alamat sudah digunakan', 409);
    }

    // If this is set as main address, update existing main address
    if (isMain) {
      await supabase
        .from('user_addresses')
        .update({ is_main: false })
        .eq('user_id', userId)
        .eq('is_main', true);
    }

    // Create new address
    const { data: newAddress, error } = await supabase
      .from('user_addresses')
      .insert({
        user_id: userId,
        label,
        full_address: fullAddress,
        city,
        postal_code: postalCode,
        latitude,
        longitude,
        is_main: isMain
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating address:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return sendError(res, 'Label alamat sudah digunakan', 409);
      }
      
      return sendError(res, 'Gagal membuat alamat', 500);
    }

    // Format response
    const formattedAddress = {
      id: newAddress.id,
      label: newAddress.label,
      fullAddress: newAddress.full_address,
      city: newAddress.city,
      postalCode: newAddress.postal_code,
      latitude: newAddress.latitude,
      longitude: newAddress.longitude,
      isMain: newAddress.is_main,
      createdAt: newAddress.created_at,
      updatedAt: newAddress.updated_at
    };

    sendSuccess(res, formattedAddress, 'Alamat berhasil ditambahkan', 201);

  } catch (error) {
    console.error('Create address error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Update address
 */
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if address exists and belongs to user
    const { data: existingAddress, error: findError } = await supabase
      .from('user_addresses')
      .select('id, label, is_main')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !existingAddress) {
      return sendNotFound(res, 'Alamat tidak ditemukan');
    }

    // Check if new label already exists (if label is being updated)
    if (updateData.label && updateData.label !== existingAddress.label) {
      const { data: labelExists, error: labelCheckError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('user_id', userId)
        .eq('label', updateData.label)
        .neq('id', id)
        .maybeSingle();

      if (labelCheckError) {
        console.error('Error checking duplicate label:', labelCheckError);
        return sendError(res, 'Gagal memeriksa label alamat', 500);
      }

      if (labelExists) {
        return sendError(res, 'Label alamat sudah digunakan', 409);
      }
    }

    // If setting as main address, update existing main address
    if (updateData.isMain === true && !existingAddress.is_main) {
      await supabase
        .from('user_addresses')
        .update({ is_main: false })
        .eq('user_id', userId)
        .eq('is_main', true);
    }

    // Prepare update data
    const addressUpdateData = {};
    if (updateData.label) addressUpdateData.label = updateData.label;
    if (updateData.fullAddress) addressUpdateData.full_address = updateData.fullAddress;
    if (updateData.city) addressUpdateData.city = updateData.city;
    if (updateData.postalCode !== undefined) addressUpdateData.postal_code = updateData.postalCode;
    if (updateData.latitude !== undefined) addressUpdateData.latitude = updateData.latitude;
    if (updateData.longitude !== undefined) addressUpdateData.longitude = updateData.longitude;
    if (updateData.isMain !== undefined) addressUpdateData.is_main = updateData.isMain;

    // Update address
    const { data: updatedAddress, error } = await supabase
      .from('user_addresses')
      .update(addressUpdateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating address:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return sendError(res, 'Label alamat sudah digunakan', 409);
      }
      
      return sendError(res, 'Gagal mengupdate alamat', 500);
    }

    // Format response
    const formattedAddress = {
      id: updatedAddress.id,
      label: updatedAddress.label,
      fullAddress: updatedAddress.full_address,
      city: updatedAddress.city,
      postalCode: updatedAddress.postal_code,
      latitude: updatedAddress.latitude,
      longitude: updatedAddress.longitude,
      isMain: updatedAddress.is_main,
      createdAt: updatedAddress.created_at,
      updatedAt: updatedAddress.updated_at
    };

    sendSuccess(res, formattedAddress, 'Alamat berhasil diupdate');

  } catch (error) {
    console.error('Update address error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Set main address
 */
const setMainAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { isMain } = req.body;

    // Check if address exists and belongs to user
    const { data: existingAddress, error: findError } = await supabase
      .from('user_addresses')
      .select('id, is_main')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !existingAddress) {
      return sendNotFound(res, 'Alamat tidak ditemukan');
    }

    if (isMain) {
      // Remove main status from other addresses
      await supabase
        .from('user_addresses')
        .update({ is_main: false })
        .eq('user_id', userId)
        .eq('is_main', true);
    }

    // Update address main status
    const { data: updatedAddress, error } = await supabase
      .from('user_addresses')
      .update({ is_main: isMain })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error setting main address:', error);
      return sendError(res, 'Gagal mengupdate alamat utama', 500);
    }

    sendSuccess(res, {
      id: updatedAddress.id,
      isMain: updatedAddress.is_main
    }, `Alamat berhasil ${isMain ? 'dijadikan' : 'dihapus dari'} alamat utama`);

  } catch (error) {
    console.error('Set main address error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Delete address
 */
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if address exists and belongs to user
    const { data: existingAddress, error: findError } = await supabase
      .from('user_addresses')
      .select('id, label, is_main')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !existingAddress) {
      return sendNotFound(res, 'Alamat tidak ditemukan');
    }

    // Check if address is being used in any pending/active orders
    const { data: ordersUsingAddress, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('address_id', id)
      .in('status', ['pending', 'confirmed', 'on_the_way', 'in_progress'])
      .limit(1);

    if (ordersError) {
      console.error('Error checking orders:', ordersError);
      return sendError(res, 'Gagal memeriksa penggunaan alamat', 500);
    }

    if (ordersUsingAddress && ordersUsingAddress.length > 0) {
      return sendError(res, 'Alamat tidak dapat dihapus karena sedang digunakan dalam pesanan aktif', 400);
    }

    // Delete address
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting address:', error);
      return sendError(res, 'Gagal menghapus alamat', 500);
    }

    // If deleted address was main address, set another address as main (if any)
    if (existingAddress.is_main) {
      const { data: otherAddresses } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (otherAddresses && otherAddresses.length > 0) {
        await supabase
          .from('user_addresses')
          .update({ is_main: true })
          .eq('id', otherAddresses[0].id);
      }
    }

    sendSuccess(res, null, 'Alamat berhasil dihapus');

  } catch (error) {
    console.error('Delete address error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get user's main address
 */
const getMainAddress = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: mainAddress, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_main', true)
      .single();

    if (error || !mainAddress) {
      return sendNotFound(res, 'Alamat utama tidak ditemukan');
    }

    // Format response
    const formattedAddress = {
      id: mainAddress.id,
      label: mainAddress.label,
      fullAddress: mainAddress.full_address,
      city: mainAddress.city,
      postalCode: mainAddress.postal_code,
      latitude: mainAddress.latitude,
      longitude: mainAddress.longitude,
      isMain: mainAddress.is_main,
      createdAt: mainAddress.created_at,
      updatedAt: mainAddress.updated_at
    };

    sendSuccess(res, formattedAddress, 'Alamat utama berhasil diambil');

  } catch (error) {
    console.error('Get main address error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get address statistics for user
 */
const getAddressStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total addresses
    const { count: totalAddresses, error: totalError } = await supabase
      .from('user_addresses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalError) {
      console.error('Error getting total addresses:', totalError);
      return sendError(res, 'Gagal mengambil statistik alamat', 500);
    }

    // Addresses by city
    const { data: addressesByCity, error: cityError } = await supabase
      .from('user_addresses')
      .select('city')
      .eq('user_id', userId);

    if (cityError) {
      console.error('Error getting addresses by city:', cityError);
      return sendError(res, 'Gagal mengambil statistik kota', 500);
    }

    const cityCount = {};
    addressesByCity?.forEach(address => {
      const city = address.city || 'Unknown';
      cityCount[city] = (cityCount[city] || 0) + 1;
    });

    const stats = {
      totalAddresses: totalAddresses || 0,
      citiesBreakdown: Object.entries(cityCount).map(([city, count]) => ({
        city,
        count
      }))
    };

    sendSuccess(res, stats, 'Statistik alamat berhasil diambil');

  } catch (error) {
    console.error('Get address stats error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

module.exports = {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  setMainAddress,
  deleteAddress,
  getMainAddress,
  getAddressStats
};