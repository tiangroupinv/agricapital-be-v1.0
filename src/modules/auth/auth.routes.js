const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const { protect } = require("../../middleware/auth");

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post("/signup", authController.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get("/me", protect, authController.getMe);

module.exports = router;
