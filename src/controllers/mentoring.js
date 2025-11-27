const { Op } = require('sequelize');
const db = require('../models');
const midtransService = require('../services/midtransService');

const User = db.User;
const MentorProfile = db.MentorProfile;
const Mentoring = db.Mentoring;
const MetodeMentoring = db.MetodeMentoring;
const MentoringPayment = db.MentoringPayment;
const MentorActivity = db.MentorActivity;

/**
 * Get semua mentor
 */
exports.getAllMentors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, position, minFee, maxFee } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const whereClause = {};

    if (position) {
      whereClause.position = {
        [Op.like]: `%${position}%`
      };
    }

    if (minFee || maxFee) {
      whereClause.fee = {};
      if (minFee) whereClause.fee[Op.gte] = parseFloat(minFee);
      if (maxFee) whereClause.fee[Op.lte] = parseFloat(maxFee);
    }

    // User search
    const userWhere = {};
    if (search) {
      userWhere.full_name = {
        [Op.like]: `%${search}%`
      };
    }

    const { count, rows: mentors } = await MentorProfile.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
        attributes: ['user_id', 'full_name', 'email', 'phone_number']
      }],
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Mentors retrieved successfully',
      data: {
        mentors,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all mentors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mentors',
      error: error.message
    });
  }
};

/**
 * Get detail mentor by ID
 */
exports.getMentorDetail = async (req, res) => {
  try {
    const { mentorId } = req.params;

    const mentor = await MentorProfile.findByPk(mentorId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['user_id', 'full_name', 'email', 'phone_number', 'birth_date', 'address'],
        include: [{
          model: MentorActivity,
          as: 'mentorActivities',
          attributes: ['mentor_activity_id', 'judul_aktivitas', 'deskripsi', 'created_at']
        }]
      }]
    });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    // Get total completed sessions
    const completedSessions = await Mentoring.count({
      where: {
        mentor_user_id: mentor.user_id,
        jadwal: {
          [Op.lt]: new Date()
        }
      },
      include: [{
        model: MentoringPayment,
        as: 'payment',
        where: {
          transaction_status: 'settlement'
        },
        required: true
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Mentor detail retrieved successfully',
      data: {
        ...mentor.toJSON(),
        // completed_sessions: completedSessions
      }
    });
  } catch (error) {
    console.error('Get mentor detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mentor detail',
      error: error.message
    });
  }
};

/**
 * Schedule mentoring session with payment
 */
exports.scheduleMentoring = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const userId = req.user.user_id;
    const { mentor_user_id, jadwal, tujuan_mentoring, metode_mentoring_id } = req.body;

    // Validate mentor exists
    const mentor = await MentorProfile.findOne({
      where: {
        user_id: mentor_user_id
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['full_name', 'email']
      }]
    });

    if (!mentor) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    // Validate jadwal tidak boleh di masa lalu
    const scheduledDate = new Date(jadwal);
    if (scheduledDate < new Date()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Schedule date must be in the future'
      });
    }

    // Check mentor availability at that time
    const existingSchedule = await Mentoring.findOne({
      where: {
        mentor_user_id,
        jadwal: {
          [Op.between]: [
            new Date(scheduledDate.getTime() - 60 * 60 * 1000), // 1 hour before
            new Date(scheduledDate.getTime() + 60 * 60 * 1000)  // 1 hour after
          ]
        }
      }
    });

    if (existingSchedule) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Mentor is not available at this time. Please choose another time slot.'
      });
    }

    // Validate metode mentoring
    const metodeMentoring = await MetodeMentoring.findByPk(metode_mentoring_id);
    if (!metodeMentoring) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Metode mentoring not found'
      });
    }

    // Get user details
    const user = await User.findByPk(userId, {
      attributes: ['full_name', 'email', 'phone_number']
    });

    // Create mentoring record
    const mentoring = await Mentoring.create({
      jadwal: scheduledDate,
      tujuan_mentoring,
      metode_mentoring_id,
      mentor_user_id,
      mentee_user_id: userId
    }, { transaction });

    // Create payment
    const orderId = `MENTORING-${mentoring.mentoring_id}-${Date.now()}`;
    const grossAmount = parseFloat(mentor.fee);

    // Create payment in Midtrans
    const paymentTransaction = await midtransService.createTransaction({
      orderId,
      grossAmount,
      customerDetails: {
        first_name: user.full_name,
        email: user.email,
        phone: user.phone_number || '08123456789'
      },
      itemDetails: [{
        id: `MENTOR-${mentor.mentor_profile_id}`,
        price: grossAmount,
        quantity: 1,
        name: `Mentoring Session with ${mentor.user.full_name}`,
        merchant_name: 'Swara - Latih Swara'
      }]
    });

    // Save payment record
    const payment = await MentoringPayment.create({
      mentoring_id: mentoring.mentoring_id,
      order_id: orderId,
      gross_amount: grossAmount,
      payment_url: paymentTransaction.redirect_url,
      transaction_status: 'pending'
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Mentoring session scheduled successfully. Please complete the payment.',
      data: {
        mentoring_id: mentoring.mentoring_id,
        jadwal: mentoring.jadwal,
        mentor: {
          name: mentor.user.full_name,
          position: mentor.position
        },
        payment: {
          order_id: payment.order_id,
          gross_amount: payment.gross_amount,
          payment_url: payment.payment_url,
          status: payment.transaction_status
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Schedule mentoring error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule mentoring session',
      error: error.message
    });
  }
};

/**
 * Get user's scheduled mentoring sessions
 */
exports.getUserMentoringSessions = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status, page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const whereClause = {
      mentee_user_id: userId
    };

    // Filter by status
    let paymentWhere = {};
    if (status === 'paid') {
      paymentWhere.transaction_status = 'settlement';
    } else if (status === 'pending') {
      paymentWhere.transaction_status = 'pending';
    } else if (status === 'failed') {
      paymentWhere.transaction_status = {
        [Op.in]: ['deny', 'cancel', 'expire', 'failure']
      };
    }

    const { count, rows: sessions } = await Mentoring.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'mentor',
          attributes: ['user_id', 'full_name', 'email', 'phone_number'],
          include: [{
            model: MentorProfile,
            as: 'mentorProfile',
            attributes: ['specialization', 'rating', 'profile_picture']
          }]
        },
        {
          model: MetodeMentoring,
          as: 'metodeMentoring',
          attributes: ['metode_mentoring_id', 'metode_mentoring']
        },
        {
          model: MentoringPayment,
          as: 'payment',
          where: Object.keys(paymentWhere).length > 0 ? paymentWhere : undefined,
          required: Object.keys(paymentWhere).length > 0
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['jadwal', 'DESC']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    // Categorize sessions
    const now = new Date();
    const categorizedSessions = sessions.map(session => {
      const sessionDate = new Date(session.jadwal);
      let sessionStatus = 'scheduled';

      if (session.payment && session.payment.transaction_status === 'settlement') {
        if (sessionDate < now) {
          sessionStatus = 'completed';
        } else {
          sessionStatus = 'upcoming';
        }
      } else if (session.payment && session.payment.transaction_status === 'pending') {
        sessionStatus = 'pending_payment';
      } else {
        sessionStatus = 'payment_failed';
      }

      return {
        ...session.toJSON(),
        session_status: sessionStatus
      };
    });

    res.status(200).json({
      success: true,
      message: 'Mentoring sessions retrieved successfully',
      data: {
        sessions: categorizedSessions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user mentoring sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mentoring sessions',
      error: error.message
    });
  }
};

/**
 * Get detail mentoring session
 */
exports.getMentoringDetail = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { mentoringId } = req.params;

    const session = await Mentoring.findOne({
      where: {
        mentoring_id: mentoringId,
        [Op.or]: [
          { mentee_user_id: userId },
          { mentor_user_id: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'mentor',
          attributes: ['user_id', 'full_name', 'email', 'phone_number'],
          include: [{
            model: MentorProfile,
            as: 'mentorProfile'
          }]
        },
        {
          model: User,
          as: 'mentee',
          attributes: ['user_id', 'full_name', 'email', 'phone_number']
        },
        {
          model: MetodeMentoring,
          as: 'metodeMentoring'
        },
        {
          model: MentoringPayment,
          as: 'payment'
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Mentoring session not found'
      });
    }

    // Determine session status
    const now = new Date();
    const sessionDate = new Date(session.jadwal);
    let sessionStatus = 'scheduled';

    if (session.payment && session.payment.transaction_status === 'settlement') {
      if (sessionDate < now) {
        sessionStatus = 'completed';
      } else {
        sessionStatus = 'upcoming';
      }
    } else if (session.payment && session.payment.transaction_status === 'pending') {
      sessionStatus = 'pending_payment';
    } else {
      sessionStatus = 'payment_failed';
    }

    // Tambahkan role user dalam response
    const userRole = session.mentee_user_id === userId ? 'mentee' : 'mentor';

    res.status(200).json({
      success: true,
      message: 'Mentoring session detail retrieved successfully',
      data: {
        ...session.toJSON(),
        session_status: sessionStatus,
        user_role: userRole // Tambahkan informasi role user
      }
    });
  } catch (error) {
    console.error('Get mentoring detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mentoring session detail',
      error: error.message
    });
  }
};

/**
 * Handle Midtrans payment notification webhook
 */
exports.handlePaymentNotification = async (req, res) => {
  try {
    console.log('📨 Received Midtrans notification:', req.body);

    const notification = req.body;

    // Validate required fields
    if (!notification.order_id || !notification.transaction_status) {
      console.error('Invalid notification data:', notification);
      return res.status(400).json({
        success: false,
        message: 'Invalid notification data'
      });
    }

    // Detect if this is manual testing (no real Midtrans transaction)
    const isManualTest = !notification.signature_key ||
      notification.signature_key === 'test-signature' ||
      process.env.MIDTRANS_SKIP_VERIFICATION === 'true';

    if (isManualTest) {
      console.log('🧪 TESTING MODE: Manual webhook test detected');
    }

    // Handle notification dari Midtrans
    const statusResponse = await midtransService.handleNotification(notification, isManualTest);

    console.log('Status response processed:', statusResponse);

    // Find payment record - use findByPk or simple where
    const payment = await MentoringPayment.findOne({
      where: {
        order_id: statusResponse.orderId
      }
    });

    console.log('Payment found:', payment ? payment.toJSON() : null);

    if (!payment) {
      console.error('Payment not found for order_id:', statusResponse.orderId);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Get mentoring details separately
    const mentoring = await Mentoring.findOne({
      where: {
        mentoring_id: payment.mentoring_id
      },
      include: [
        {
          model: User,
          as: 'mentee',
          attributes: ['user_id', 'full_name', 'email']
        },
        {
          model: User,
          as: 'mentor',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    // Update payment status
    const updateData = {
      transaction_status: statusResponse.transactionStatus,
      payment_type: statusResponse.paymentType,
      transaction_id: statusResponse.transactionId,
      fraud_status: statusResponse.fraudStatus
    };

    // Handle different transaction statuses
    if (statusResponse.transactionStatus === 'settlement' ||
      (statusResponse.transactionStatus === 'capture' && statusResponse.fraudStatus === 'accept')) {
      // Payment successful
      updateData.paid_at = new Date();
      updateData.transaction_status = 'settlement';

      console.log('✅ Payment SUCCESS for order:', statusResponse.orderId);

      if (mentoring) {
        console.log('Mentoring details:', {
          mentoring_id: mentoring.mentoring_id,
          mentee: mentoring.mentee ? mentoring.mentee.full_name : 'N/A',
          mentor: mentoring.mentor ? mentoring.mentor.full_name : 'N/A',
          jadwal: mentoring.jadwal
        });

        // TODO: Send email notification to mentee and mentor
        // TODO: Add to calendar or schedule notification
      }

    } else if (statusResponse.transactionStatus === 'pending') {
      console.log('⏳ Payment PENDING for order:', statusResponse.orderId);

    } else if (statusResponse.transactionStatus === 'deny' ||
      statusResponse.transactionStatus === 'expire' ||
      statusResponse.transactionStatus === 'cancel') {
      console.log('❌ Payment FAILED for order:', statusResponse.orderId, '- Status:', statusResponse.transactionStatus);

    } else if (statusResponse.transactionStatus === 'refund') {
      console.log('↩️ Payment REFUNDED for order:', statusResponse.orderId);
    }

    // Update payment record
    await payment.update(updateData);

    console.log('Payment notification processed successfully:', {
      orderId: statusResponse.orderId,
      status: statusResponse.transactionStatus,
      payment_id: payment.payment_id
    });

    // Midtrans expects 200 OK response
    res.status(200).json({
      success: true,
      message: 'Notification received successfully'
    });

  } catch (error) {
    console.error('❌ Handle payment notification error:', error);
    console.error('Error stack:', error.stack);

    // Still return 200 to Midtrans to prevent retry
    res.status(200).json({
      success: false,
      message: 'Notification received but processing failed',
      error: error.message
    });
  }
};

/**
 * Check payment status
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { mentoringId } = req.params;
    const userId = req.user.user_id;

    // Verify user owns this mentoring
    const mentoring = await Mentoring.findOne({
      where: {
        mentoring_id: mentoringId,
        mentee_user_id: userId
      },
      include: [{
        model: MentoringPayment,
        as: 'payment'
      }, {
        model: User,
        as: 'mentor',
        attributes: ['user_id', 'full_name']
      }]
    });

    if (!mentoring || !mentoring.payment) {
      return res.status(404).json({
        success: false,
        message: 'Mentoring session or payment not found'
      });
    }

    console.log('Checking payment status for order:', mentoring.payment.order_id);

    // Check status from Midtrans
    const status = await midtransService.checkTransactionStatus(mentoring.payment.order_id);

    console.log('Midtrans status response:', status);

    // Update local payment record if status changed
    if (status.transactionStatus !== mentoring.payment.transaction_status) {
      const updateData = {
        transaction_status: status.transactionStatus,
        payment_type: status.paymentType,
        transaction_id: status.transactionId,
        fraud_status: status.fraudStatus
      };

      if ((status.transactionStatus === 'settlement' ||
        (status.transactionStatus === 'capture' && status.fraudStatus === 'accept'))
        && !mentoring.payment.paid_at) {
        updateData.paid_at = new Date();
        updateData.transaction_status = 'settlement';

        console.log('✅ Payment confirmed via status check:', mentoring.payment.order_id);
      }

      await mentoring.payment.update(updateData);
      console.log('Payment record updated in database');
    }

    res.status(200).json({
      success: true,
      message: 'Payment status retrieved successfully',
      data: {
        mentoring_id: mentoring.mentoring_id,
        mentor: {
          name: mentoring.mentor.full_name
        },
        jadwal: mentoring.jadwal,
        payment: {
          order_id: status.orderId,
          transaction_status: status.transactionStatus,
          payment_type: status.paymentType,
          gross_amount: status.grossAmount,
          transaction_time: status.transactionTime,
          paid_at: mentoring.payment.paid_at,
          payment_url: mentoring.payment.payment_url
        }
      }
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
};
