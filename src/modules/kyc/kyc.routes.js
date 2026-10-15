const express = require("express");
const router = express.Router();

const kycController = require("./kyc.controller");
const { protect, authorize } = require("../../middleware/auth");
const { ROLES } = require("../../constants");

/**
 * @route   PATCH /api/kyc/:id
 * @desc    Submit/update investor KYC profile
 * @access  Private (investor only)
 */
router.patch("/:id", protect, authorize(ROLES.INVESTOR), kycController.submitKycProfile);

/**
 * @route   GET /api/kyc/:id
 * @desc    Read investor KYC profile
 * @access  Private (owner or admin)
 */
router.get("/:id", protect, kycController.getKycProfile);

/**
 * @route   PATCH /api/kyc/:id/status
 * @desc    Update investor KYC status (admin review)
 * @access  Private (admin only)
 */
router.patch("/:id/status", protect, authorize(ROLES.ADMIN), kycController.updateKycStatus);

module.exports = router;