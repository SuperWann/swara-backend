const midtransClient = require('midtrans-client');

class MidtransService {
  constructor() {
    // Initialize Snap client
    this.snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    // Initialize Core API client for notification
    this.coreApi = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });
  }

  /**
   * Create transaction untuk mentoring
   * @param {Object} params - Parameter transaksi
   * @returns {Promise<Object>} Transaction token dan redirect URL
   */
  async createTransaction(params) {
    try {
      const { orderId, grossAmount, customerDetails, itemDetails } = params;

      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount
        },
        customer_details: customerDetails,
        item_details: itemDetails,
        callbacks: {
          finish: process.env.MIDTRANS_FINISH_URL || 'https://your-app.com/payment/finish',
          error: process.env.MIDTRANS_ERROR_URL || 'https://your-app.com/payment/error',
          pending: process.env.MIDTRANS_PENDING_URL || 'https://your-app.com/payment/pending'
        }
      };

      const transaction = await this.snap.createTransaction(parameter);
      
      return {
        token: transaction.token,
        redirect_url: transaction.redirect_url
      };
    } catch (error) {
      console.error('Midtrans create transaction error:', error);
      throw new Error('Failed to create payment transaction: ' + error.message);
    }
  }

  /**
   * Verify notification dari Midtrans
   * @param {Object} notification - Notification data dari Midtrans
   * @param {boolean} skipVerification - Skip verification untuk testing (default: false)
   * @returns {Promise<Object>} Status notification
   */
  async handleNotification(notification, skipVerification = false) {
    try {
      // Mode testing: skip Midtrans API verification
      if (skipVerification || process.env.MIDTRANS_SKIP_VERIFICATION === 'true') {
        console.log('⚠️  TESTING MODE: Skipping Midtrans verification');
        return {
          orderId: notification.order_id,
          transactionStatus: notification.transaction_status,
          fraudStatus: notification.fraud_status || 'accept',
          paymentType: notification.payment_type,
          transactionId: notification.transaction_id
        };
      }

      // Production mode: verify dengan Midtrans API
      const statusResponse = await this.coreApi.transaction.notification(notification);
      
      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;
      const paymentType = statusResponse.payment_type;
      const transactionId = statusResponse.transaction_id;

      return {
        orderId,
        transactionStatus,
        fraudStatus,
        paymentType,
        transactionId
      };
    } catch (error) {
      console.error('Midtrans notification error:', error);
      
      // Jika error 404 dan bukan production, allow sebagai testing
      if (error.message.includes('404') && !this.snap.isProduction) {
        console.log('⚠️  Transaction not found in Midtrans (probably testing). Processing anyway...');
        return {
          orderId: notification.order_id,
          transactionStatus: notification.transaction_status,
          fraudStatus: notification.fraud_status || 'accept',
          paymentType: notification.payment_type,
          transactionId: notification.transaction_id
        };
      }
      
      throw new Error('Failed to handle payment notification: ' + error.message);
    }
  }

  /**
   * Check transaction status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Transaction status
   */
  async checkTransactionStatus(orderId) {
    try {
      const statusResponse = await this.coreApi.transaction.status(orderId);
      
      return {
        orderId: statusResponse.order_id,
        transactionStatus: statusResponse.transaction_status,
        fraudStatus: statusResponse.fraud_status,
        paymentType: statusResponse.payment_type,
        transactionId: statusResponse.transaction_id,
        grossAmount: statusResponse.gross_amount,
        transactionTime: statusResponse.transaction_time
      };
    } catch (error) {
      console.error('Midtrans check status error:', error);
      throw new Error('Failed to check transaction status: ' + error.message);
    }
  }

  /**
   * Cancel transaction
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Cancel result
   */
  async cancelTransaction(orderId) {
    try {
      const response = await this.coreApi.transaction.cancel(orderId);
      return response;
    } catch (error) {
      console.error('Midtrans cancel transaction error:', error);
      throw new Error('Failed to cancel transaction: ' + error.message);
    }
  }
}

module.exports = new MidtransService();
