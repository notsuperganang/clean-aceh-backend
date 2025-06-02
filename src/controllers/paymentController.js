const midtransClient = require('midtrans-client');
const { supabase } = require('../config/database');
const {
  sendSuccess,
  sendError,
  sendNotFound,
  sendPaginated,
  createPagination
} = require('../utils/response');

// Initialize Midtrans Core API
const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/**
 * Create payment with Midtrans
 */
const createPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, paymentMethodId } = req.body;

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        users!orders_customer_id_fkey(full_name, email, phone)
      `)
      .eq('id', orderId)
      .eq('customer_id', userId)
      .single();

    if (orderError || !order) {
      return sendNotFound(res, 'Pesanan tidak ditemukan');
    }

    if (order.status !== 'confirmed') {
      return sendError(res, 'Pesanan belum dikonfirmasi', 400);
    }

    // Get payment method
    const { data: paymentMethod, error: pmError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (pmError || !paymentMethod) {
      return sendNotFound(res, 'Metode pembayaran tidak ditemukan');
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'paid'])
      .single();

    if (existingPayment) {
      return sendError(res, 'Pembayaran sudah ada untuk pesanan ini', 409);
    }

    // Generate unique payment ID
    const paymentId = `CA-${order.order_number}-${Date.now()}`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        payment_method_id: paymentMethodId,
        amount: order.total_price,
        status: 'pending',
        payment_reference: paymentId
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return sendError(res, 'Gagal membuat pembayaran', 500);
    }

    // Prepare Midtrans parameter
    const parameter = {
      payment_type: getPaymentType(paymentMethod.type, paymentMethod.provider),
      transaction_details: {
        order_id: paymentId,
        gross_amount: order.total_price
      },
      customer_details: {
        first_name: order.users.full_name,
        email: order.users.email,
        phone: order.users.phone
      },
      item_details: [{
        id: order.service_id,
        price: order.total_price,
        quantity: 1,
        name: `CleanAceh - ${order.order_number}`
      }]
    };

    // Add payment method specific parameters
    if (paymentMethod.type === 'ewallet') {
      if (paymentMethod.provider === 'GoPay') {
        parameter.gopay = {
          enable_callback: true,
          callback_url: `${process.env.FRONTEND_URL}/payment/result`
        };
      }
    }

    // Create transaction with Midtrans
    const midtransResponse = await coreApi.charge(parameter);

    // Update payment with Midtrans response
    await supabase
      .from('payments')
      .update({
        payment_reference: midtransResponse.transaction_id || paymentId
      })
      .eq('id', payment.id);

    // Format response
    const responseData = {
      paymentId: payment.id,
      orderId: orderId,
      amount: payment.amount,
      status: payment.status,
      midtransResponse: {
        transactionId: midtransResponse.transaction_id,
        transactionStatus: midtransResponse.transaction_status,
        paymentType: midtransResponse.payment_type,
        redirectUrl: midtransResponse.redirect_url,
        deeplink: midtransResponse.actions?.find(a => a.name === 'deeplink-redirect')?.url,
        qrString: midtransResponse.actions?.find(a => a.name === 'generate-qr-code')?.url
      }
    };

    sendSuccess(res, responseData, 'Pembayaran berhasil dibuat', 201);

  } catch (error) {
    console.error('Create payment error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Handle Midtrans webhook
 */
const handleWebhook = async (req, res) => {
  try {
    const notification = req.body;
    
    // Verify webhook (simplified for MVP)
    const { transaction_status, order_id, fraud_status } = notification;

    console.log('Midtrans webhook received:', { transaction_status, order_id, fraud_status });

    // Get payment by reference
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', order_id)
      .single();

    if (findError || !payment) {
      console.error('Payment not found for order_id:', order_id);
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Determine payment status
    let newStatus = payment.status;
    let paidAt = null;

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'accept' || !fraud_status) {
        newStatus = 'paid';
        paidAt = new Date().toISOString();
      }
    } else if (transaction_status === 'pending') {
      newStatus = 'pending';
    } else if (['deny', 'expire', 'cancel'].includes(transaction_status)) {
      newStatus = 'failed';
    }

    // Update payment status
    const updateData = { status: newStatus };
    if (paidAt) updateData.paid_at = paidAt;

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return res.status(500).json({ message: 'Failed to update payment' });
    }

    // Update order status if payment successful
    if (newStatus === 'paid') {
      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', payment.order_id);

      // Create notification
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('id', payment.order_id)
        .single();

      if (order) {
        await supabase
          .from('notifications')
          .insert({
            user_id: order.customer_id,
            title: 'Pembayaran Berhasil',
            message: 'Pembayaran Anda telah dikonfirmasi',
            type: 'payment',
            related_id: payment.id
          });
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * Get payment history for user
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      status
    } = req.query;

    const pagination = createPagination({ page, limit });

    let query = supabase
      .from('payments')
      .select(`
        *,
        orders!inner(
          order_number, 
          service_date, 
          customer_id,
          services(name)
        ),
        payment_methods(type, provider)
      `, { count: 'exact' })
      .eq('orders.customer_id', userId);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Sort by creation date
    query = query.order('created_at', { ascending: false });

    // Pagination
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Error fetching payment history:', error);
      return sendError(res, 'Gagal mengambil riwayat pembayaran', 500);
    }

    // Format response
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      orderId: payment.order_id,
      orderNumber: payment.orders.order_number,
      serviceName: payment.orders.services?.name,
      serviceDate: payment.orders.service_date,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: {
        type: payment.payment_methods?.type,
        provider: payment.payment_methods?.provider
      },
      paidAt: payment.paid_at,
      createdAt: payment.created_at
    }));

    return sendPaginated(
      res,
      formattedPayments,
      {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0
      },
      'Riwayat pembayaran berhasil diambil'
    );

  } catch (error) {
    console.error('Get payment history error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Get payment by ID
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders!inner(
          order_number, 
          customer_id, 
          total_price,
          service_date,
          services(name)
        ),
        payment_methods(type, provider, account_number)
      `)
      .eq('id', id)
      .eq('orders.customer_id', userId)
      .single();

    if (error || !payment) {
      return sendNotFound(res, 'Pembayaran tidak ditemukan');
    }

    // Format response
    const formattedPayment = {
      id: payment.id,
      orderId: payment.order_id,
      orderNumber: payment.orders.order_number,
      serviceName: payment.orders.services?.name,
      serviceDate: payment.orders.service_date,
      amount: payment.amount,
      status: payment.status,
      paymentReference: payment.payment_reference,
      paymentMethod: {
        type: payment.payment_methods?.type,
        provider: payment.payment_methods?.provider,
        accountNumber: payment.payment_methods?.account_number
      },
      paidAt: payment.paid_at,
      createdAt: payment.created_at
    };

    sendSuccess(res, formattedPayment, 'Detail pembayaran berhasil diambil');

  } catch (error) {
    console.error('Get payment by ID error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Helper function to get payment type for Midtrans
 */
const getPaymentType = (type, provider) => {
  if (type === 'ewallet') {
    switch (provider.toLowerCase()) {
      case 'gopay': return 'gopay';
      case 'dana': return 'dana';
      case 'ovo': return 'ovo';
      case 'linkaja': return 'linkaja';
      case 'shopeepay': return 'shopeepay';
      default: return 'gopay';
    }
  }
  
  if (type === 'bank_transfer') {
    return 'bank_transfer';
  }
  
  return 'bank_transfer'; // default
};

/**
 * Get user payment methods
 */
const getUserPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return sendError(res, 'Gagal mengambil metode pembayaran', 500);
    }

    // Format response
    const formattedMethods = paymentMethods.map(method => ({
      id: method.id,
      type: method.type,
      provider: method.provider,
      accountNumber: method.account_number,
      accountName: method.account_name,
      isActive: method.is_active,
      createdAt: method.created_at
    }));

    sendSuccess(res, formattedMethods, 'Metode pembayaran berhasil diambil');

  } catch (error) {
    console.error('Get payment methods error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Add new payment method
 */
const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, provider, accountNumber, accountName } = req.body;

    // Check if same provider already exists for user
    const { data: existingMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .maybeSingle();

    if (existingMethod) {
      return sendError(res, `${provider} sudah terdaftar`, 409);
    }

    // Create payment method
    const { data: newMethod, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        type,
        provider,
        account_number: accountNumber,
        account_name: accountName,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payment method:', error);
      return sendError(res, 'Gagal menambahkan metode pembayaran', 500);
    }

    // Format response
    const formattedMethod = {
      id: newMethod.id,
      type: newMethod.type,
      provider: newMethod.provider,
      accountNumber: newMethod.account_number,
      accountName: newMethod.account_name,
      isActive: newMethod.is_active,
      createdAt: newMethod.created_at
    };

    sendSuccess(res, formattedMethod, 'Metode pembayaran berhasil ditambahkan', 201);

  } catch (error) {
    console.error('Add payment method error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

/**
 * Delete payment method
 */
const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if payment method exists and belongs to user
    const { data: paymentMethod, error: findError } = await supabase
      .from('payment_methods')
      .select('id, provider')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !paymentMethod) {
      return sendNotFound(res, 'Metode pembayaran tidak ditemukan');
    }

    // Check if payment method is being used in pending payments
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('id')
      .eq('payment_method_id', id)
      .eq('status', 'pending')
      .limit(1);

    if (pendingPayments && pendingPayments.length > 0) {
      return sendError(res, 'Metode pembayaran sedang digunakan dalam transaksi pending', 400);
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting payment method:', error);
      return sendError(res, 'Gagal menghapus metode pembayaran', 500);
    }

    sendSuccess(res, null, 'Metode pembayaran berhasil dihapus');

  } catch (error) {
    console.error('Delete payment method error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

// Add to module.exports
module.exports = {
  createPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  getUserPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod
};