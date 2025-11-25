const express = require("express");
const { body, query } = require("express-validator");
const BasicTrainingController = require("../controllers/basicTraining");
const { auth } = require("../middleware/auth");
const { validate } = require("../middleware/validator");
const { upload } = require("../config/upload");

const router = express.Router();

const startTrainingValidation = [
  body("basic_training_level_id")
    .notEmpty()
    .withMessage("Training level ID is required")
    .isInt({ min: 1 })
    .withMessage("Training level ID must be a valid number"),
];

const uploadValidation = [
  body("basic_training_session_id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isInt({ min: 1 })
    .withMessage("Session ID must be a valid number"),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive number"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1-100"),
  query("mode_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Mode ID must be a valid number"),
];

const artikulasiAssessmentValidation = [
  body("basic_training_session_id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isInt({ min: 1 })
    .withMessage("Session ID must be a valid number"),
  body("basic_training_material_id")
    .notEmpty()
    .withMessage("Material ID is required")
    .isInt({ min: 1 })
    .withMessage("Material ID must be a valid number"),
];

const completeSessionValidation = [
  body("basic_training_session_id")
    .notEmpty()
    .withMessage("Session ID is required")
    .isInt({ min: 1 })
    .withMessage("Session ID must be a valid number"),
];

router.use(auth);

// Get all training modes with progress
router.get("/modes", BasicTrainingController.getAllModes);

// Get mode detail with levels and unlock status
router.get("/modes/:id", BasicTrainingController.getModeDetail);

// Start new training session
router.post(
  "/start",
  startTrainingValidation,
  validate,
  BasicTrainingController.startTraining
);

// Upload video and get AI analysis
router.post(
  "/upload",
  upload.single("video"),
  uploadValidation,
  validate,
  BasicTrainingController.uploadAndAnalyze
);

// Get specific session detail
router.get("/sessions/:id", BasicTrainingController.getSessionDetail);

// Get user's training history
router.get(
  "/history",
  paginationValidation,
  validate,
  BasicTrainingController.getHistory
);

// Assess single material (upload audio and get AI feedback)
router.post(
  "/artikulasi/assess-material",
  upload.single("audio"),
  (req, res, next) => {
    next();
  },
  artikulasiAssessmentValidation,
  validate,
  BasicTrainingController.assessArticulationMaterial
);

// Complete artikulasi session (calculate final scores from all materials)
router.post(
  "/artikulasi/complete-session",
  completeSessionValidation,
  validate,
  BasicTrainingController.completeArtikulasiSession
);

// Get session assessments detail (all material assessments)
router.get(
  "/sessions/:id/assessments",
  BasicTrainingController.getSessionAssessments
);

module.exports = router;
