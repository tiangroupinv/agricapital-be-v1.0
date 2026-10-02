const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../../middleware/auth");
const { ROLES } = require("../../constants");
const investmentsController = require("./investments.controller");

/**
 * @route   POST /api/investments/:id/confirm
 * @desc    Confirm investment (requires verified KYC)
 * @access  Private (investor only)
 */
router.post("/:id/confirm", protect, authorize(ROLES.INVESTOR), investmentsController.confirmInvestment);

module.exports = router;
