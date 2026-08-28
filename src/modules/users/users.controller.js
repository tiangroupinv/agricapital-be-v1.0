const User = require("./users.model");
const ApiError = require("../../utils/apiError");
const { ROLES } = require("../../constants");

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
async function getUsers(req, res, next) {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Own profile, Field Agent for assigned farmers, Admin)
 */
async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Access control
    const isAdmin = currentUser.role === ROLES.ADMIN;
    const isOwnProfile = currentUser._id.toString() === id;

    if (!isAdmin && !isOwnProfile) {
      throw new ApiError(403, "You do not have permission to view this user");
    }

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc    Update user
 * @route   PATCH /api/users/:id
 * @access  Private (Own profile or Admin)
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const updateData = req.body;

    // Access control
    const isAdmin = currentUser.role === ROLES.ADMIN;
    const isOwnProfile = currentUser._id.toString() === id;

    if (!isAdmin && !isOwnProfile) {
      throw new ApiError(403, "You do not have permission to update this user");
    }

    // Non-admins can only update specific fields
    const allowedFields = ["fullName", "phone", "paymentDetails"];
    if (currentUser.role === ROLES.FARMER) {
      allowedFields.push("farmerProfile");
    }

    const filteredUpdate = {};
    if (isAdmin) {
      // Admin can update any field
      Object.assign(filteredUpdate, updateData);
    } else {
      // Non-admin can only update allowed fields
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          filteredUpdate[field] = updateData[field];
        }
      });
    }

    // Prevent role change through this endpoint
    delete filteredUpdate.role;
    delete filteredUpdate.passwordHash;

    const user = await User.findByIdAndUpdate(id, filteredUpdate, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc    Deactivate user (soft delete)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      status: "success",
      message: "User deactivated successfully",
      data: { id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc    Reactivate user
 * @route   PATCH /api/users/:id/reactivate
 * @access  Private (Admin only)
 */
async function reactivateUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      status: "success",
      message: "User reactivated successfully",
      data: { id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deactivateUser,
  reactivateUser,
};
