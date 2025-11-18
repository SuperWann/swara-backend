const { School, SchoolPackage, SchoolPayment, User, Role, Mentee, MentorProfile } = require('../models');
const midtransService = require('../services/midtransService');
const emailService = require('../services/emailService');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

exports.getSchoolPackages = async (req, res) => {
  try {
    const packages = await SchoolPackage.findAll({
      where: { is_active: true },
      order: [['package_code', 'ASC']]
    });

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Error getting school packages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get school packages',
      error: error.message
    });
  }
};

const validatePackage = async (packageId, studentCount, mentorCount) => {
  const package = await SchoolPackage.findByPk(packageId);
  
  if (!package) {
    throw new Error('Package not found');
  }

  if (!package.is_active) {
    throw new Error('Package is not active');
  }

  if (studentCount < package.min_students || studentCount > package.max_students) {
    throw new Error(
      `Student count must be between ${package.min_students} and ${package.max_students} for Package ${package.package_code}`
    );
  }

  if (mentorCount > package.max_mentors) {
    throw new Error(
      `Mentor count cannot exceed ${package.max_mentors} for Package ${package.package_code}`
    );
  }

  return package;
};

const generateSchoolToken = async () => {
  let token;
  let isUnique = false;

  while (!isUnique) {
    token = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const existing = await School.findOne({ where: { access_token: token } });
    if (!existing) {
      isUnique = true;
    }
  }

  return token;
};

const generatePassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

exports.registerSchool = async (req, res) => {
  try {
    const {
      school_name,
      npsn,
      address,
      school_status,
      official_email,
      pic_name,
      pic_position,
      pic_phone,
      package_id,
      student_count,
      mentor_count,
      duration_months
    } = req.body;

    if (!school_name || !npsn || !address || !school_status || !official_email || 
        !pic_name || !pic_position || !pic_phone || !package_id || 
        !student_count || !mentor_count || !duration_months) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!['1', '3', '6', '12'].includes(duration_months.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be 1, 3, 6, or 12 months'
      });
    }

    const selectedPackage = await validatePackage(package_id, student_count, mentor_count);

    const existingNpsn = await School.findOne({ where: { npsn } });
    if (existingNpsn) {
      return res.status(400).json({
        success: false,
        message: 'NPSN already registered'
      });
    }

    const existingEmail = await School.findOne({ where: { official_email } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const pricePerMonth = parseFloat(selectedPackage.price_per_month);
    const totalAmount = pricePerMonth * parseInt(duration_months);

    const schoolToken = await generateSchoolToken();

    const school = await School.create({
      school_name,
      npsn,
      address,
      school_status,
      official_email,
      pic_name,
      pic_position,
      pic_phone,
      package_id,
      student_count,
      mentor_count,
      duration_months,
      access_token: schoolToken,
      is_active: false
    });

    const orderId = `SCH-${school.school_id}-${Date.now()}`;

    const payment = await SchoolPayment.create({
      school_id: school.school_id,
      order_id: orderId,
      gross_amount: totalAmount,
      transaction_status: 'pending'
    });

    const midtransParams = {
      orderId: orderId,
      grossAmount: totalAmount,
      customerDetails: {
        first_name: pic_name,
        email: official_email,
        phone: pic_phone
      },
      itemDetails: [
        {
          id: `PKG-${selectedPackage.package_code}`,
          price: pricePerMonth,
          quantity: parseInt(duration_months),
          name: `${selectedPackage.package_name} - ${duration_months} bulan`
        }
      ]
    };

    const transaction = await midtransService.createTransaction(midtransParams);

    await payment.update({
      payment_token: transaction.token,
      payment_url: transaction.redirect_url
    });

    res.json({
      success: true,
      message: 'School registration created successfully. Please complete payment.',
      data: {
        school_id: school.school_id,
        order_id: orderId,
        payment_token: transaction.token,
        payment_url: transaction.redirect_url,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    console.error('Error registering school:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to register school',
      error: error.message
    });
  }
};

exports.handlePaymentNotification = async (req, res) => {
  try {
    const notification = req.body;

    const statusResponse = await midtransService.handleNotification(notification);

    const { orderId, transactionStatus, fraudStatus, paymentType, transactionId } = statusResponse;

    const payment = await SchoolPayment.findOne({
      where: { order_id: orderId },
      include: [{
        model: School,
        as: 'school',
        include: [{
          model: SchoolPackage,
          as: 'package'
        }]
      }]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.update({
      transaction_id: transactionId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_type: paymentType
    });

    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        const school = payment.school;

        await payment.update({ paid_at: new Date() });

        if (!school.admin_user_id) {
          let adminRole = await Role.findOne({ where: { role_name: 'school_admin' } });
          if (!adminRole) {
            adminRole = await Role.create({ role_name: 'school_admin' });
          }

          const generatedPassword = generatePassword();

          const adminUser = await User.create({
            full_name: school.pic_name,
            email: school.official_email,
            password: generatedPassword,
            phone_number: school.pic_phone,
            role_id: adminRole.role_id,
            school_id: school.school_id,
            status: 'aktif'
          });

          const subscriptionStart = new Date();
          const subscriptionEnd = new Date();
          subscriptionEnd.setMonth(subscriptionEnd.getMonth() + parseInt(school.duration_months));

          await school.update({
            admin_user_id: adminUser.user_id,
            is_active: true,
            subscription_start: subscriptionStart,
            subscription_end: subscriptionEnd
          });

          const invoiceData = {
            orderNumber: orderId,
            schoolName: school.school_name,
            packageName: school.package.package_name,
            studentCount: school.student_count,
            mentorCount: school.mentor_count,
            durationMonths: school.duration_months,
            pricePerMonth: parseFloat(school.package.price_per_month),
            totalAmount: parseFloat(payment.gross_amount),
            paymentDate: new Date().toLocaleDateString('id-ID'),
            paymentMethod: paymentType || 'Midtrans'
          };

          await payment.update({ invoice_data: invoiceData });

          try {
            await emailService.sendSchoolCredentials({
              to: school.official_email,
              picName: school.pic_name,
              schoolName: school.school_name,
              email: school.official_email,
              password: generatedPassword,
              token: school.access_token,
              invoiceData
            });
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment notification processed'
    });
  } catch (error) {
    console.error('Error handling payment notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment notification',
      error: error.message
    });
  }
};

exports.addMentor = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone_number,
      password
    } = req.body;

    const adminUser = req.user;
    
    if (!adminUser.school_id) {
      return res.status(403).json({
        success: false,
        message: 'You are not associated with any school'
      });
    }

    const school = await School.findByPk(adminUser.school_id, {
      include: [{ model: SchoolPackage, as: 'package' }]
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    if (!school.is_active) {
      return res.status(403).json({
        success: false,
        message: 'School is not active'
      });
    }

    const now = new Date();
    if (school.subscription_end && new Date(school.subscription_end) < now) {
      return res.status(403).json({
        success: false,
        message: 'School subscription has expired'
      });
    }

    const currentMentorCount = await User.count({
      include: [{
        model: Role,
        as: 'role',
        where: { role_name: 'mentor' }
      }],
      where: { school_id: school.school_id }
    });

    if (currentMentorCount >= school.mentor_count) {
      return res.status(400).json({
        success: false,
        message: `Mentor limit reached. Maximum ${school.mentor_count} mentors allowed for ${school.package.package_name}`
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let mentorRole = await Role.findOne({ where: { role_name: 'mentor' } });
    if (!mentorRole) {
      mentorRole = await Role.create({ role_name: 'mentor' });
    }

    const mentor = await User.create({
      full_name,
      email,
      password: password || 'Mentor123!',
      phone_number,
      role_id: mentorRole.role_id,
      school_id: school.school_id,
      status: 'aktif'
    });

    try {
      await MentorProfile.create({
        user_id: mentor.user_id,
      });
    } catch (error) {
      console.log('MentorProfile creation skipped:', error.message);
    }

    res.status(201).json({
      success: true,
      message: 'Mentor added successfully',
      data: {
        mentor_id: mentor.user_id,
        full_name: mentor.full_name,
        email: mentor.email,
        phone_number: mentor.phone_number,
        school_name: school.school_name,
        current_mentor_count: currentMentorCount + 1,
        max_mentor_count: school.mentor_count
      }
    });
  } catch (error) {
    console.error('Error adding mentor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add mentor',
      error: error.message
    });
  }
};

exports.getSchoolMentors = async (req, res) => {
  try {
    const adminUser = req.user;

    if (!adminUser.school_id) {
      return res.status(403).json({
        success: false,
        message: 'You are not associated with any school'
      });
    }

    const mentors = await User.findAll({
      where: { school_id: adminUser.school_id },
      include: [
        {
          model: Role,
          as: 'role',
          where: { role_name: 'mentor' }
        },
        {
          model: MentorProfile,
          as: 'mentorProfile',
          required: false
        }
      ],
      attributes: ['user_id', 'full_name', 'email', 'phone_number', 'status', 'created_at']
    });

    res.json({
      success: true,
      data: {
        mentors,
        total: mentors.length
      }
    });
  } catch (error) {
    console.error('Error getting mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mentors',
      error: error.message
    });
  }
};