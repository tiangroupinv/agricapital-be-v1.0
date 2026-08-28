const express = require("express");
const router = express.Router();

const usersController = require("./users.controller");
const { protect, authorize } = require("../../middleware/auth");
const { ROLES } = require("../../constants");

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination and filtering)
 * @access  Private (Admin only)
 */
router.get("/", protect, authorize(ROLES.ADMIN), usersController.getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private (Own profile or Admin)
 */
router.get("/:id", protect, usersController.getUser);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user
 * @access  Private (Own profile or Admin)
 */
router.patch("/:id", protect, usersController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate user (soft delete)
 * @access  Private (Admin only)
 */
router.delete("/:id", protect, authorize(ROLES.ADMIN), usersController.deactivateUser);

/**
 * @route   PATCH /api/users/:id/reactivate
 * @desc    Reactivate user
 * @access  Private (Admin only)
 */
router.patch("/:id/reactivate", protect, authorize(ROLES.ADMIN), usersController.reactivateUser);

module.exports = router;
