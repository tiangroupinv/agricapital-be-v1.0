const express = require("express");
const router = express.Router();

const {
  createFarmerController,
  getFarmerController,
  updateFarmerController,
  listFarmersController,
} = require("./users.controller");
const { protect, authorize } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const {
  createFarmerSchema,
  updateFarmerSchema,
  listFarmersQuerySchema,
} = require("./users.validation");
const { ROLES } = require("../../constants");

/**
 * @route   POST /api/farmers
 * @desc    Create new farmer profile
 * @access  Private (Field Agent, Admin)
 */
router.post(
  "/",
  protect,
  authorize(ROLES.FIELD_AGENT, ROLES.ADMIN),
  validate(createFarmerSchema),
  createFarmerController
);

/**
 * @route   GET /api/farmers
 * @desc    List all farmers with pagination
 * @access  Private (Field Agent, Admin)
 */
router.get(
  "/",
  protect,
  authorize(ROLES.FIELD_AGENT, ROLES.ADMIN),
  validate(listFarmersQuerySchema, "query"),
  listFarmersController
);

/**
 * @route   GET /api/farmers/:id
 * @desc    Get farmer by ID
 * @access  Private (Field Agent, Admin)
 */
router.get(
  "/:id",
  protect,
  authorize(ROLES.FIELD_AGENT, ROLES.ADMIN),
  getFarmerController
);

/**
 * @route   PATCH /api/farmers/:id
 * @desc    Update farmer profile
 * @access  Private (Field Agent, Admin)
 */
router.patch(
  "/:id",
  protect,
  authorize(ROLES.FIELD_AGENT, ROLES.ADMIN),
  validate(updateFarmerSchema),
  updateFarmerController
);

module.exports = router;