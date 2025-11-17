const express = require("express");
const router = express.Router();
const mentoringController = require("../controllers/mentoring");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validator");
const {
  getAllMentorsValidation,
  mentorIdValidation,
  scheduleMentoringValidation,
  getUserSessionsValidation,
  mentoringIdValidation,
} = require("../validators/mentoring.validator");

// Public routes - Get mentors
router.get(
  "/mentors",
  getAllMentorsValidation,
  validate,
  mentoringController.getAllMentors
);

router.get(
  "/mentors/:mentorId",
  mentorIdValidation,
  validate,
  mentoringController.getMentorDetail
);

// Protected routes - Require authentication
router.post(
  "/schedule",
  authenticate,
  scheduleMentoringValidation,
  validate,
  mentoringController.scheduleMentoring
);

router.get(
  "/sessions",
  authenticate,
  getUserSessionsValidation,
  validate,
  mentoringController.getUserMentoringSessions
);

router.get(
  "/sessions/:mentoringId",
  authenticate,
  mentoringIdValidation,
  validate,
  mentoringController.getMentoringDetail
);

router.get(
  "/payment/status/:mentoringId",
  authenticate,
  mentoringIdValidation,
  validate,
  mentoringController.checkPaymentStatus
);

// Webhook for Midtrans payment notification (no auth needed)
// Add logging middleware for debugging
router.post(
  "/payment/notification",
  (req, res, next) => {
    console.log('📨 Webhook received at:', new Date().toISOString());
    console.log('Webhook Headers:', req.headers);
    console.log('Webhook Body:', req.body);
    next();
  },
  mentoringController.handlePaymentNotification
);

module.exports = router;
