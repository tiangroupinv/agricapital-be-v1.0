const User = require("./users.model");
const { createFarmer, updateFarmer, getFarmerById, listFarmers } = require("./farmer.service");
const ApiError = require("../../utils/apiError");
const { ROLES } = require("../../constants");

/**
 * @swagger
 * /api/farmers:
 *   post:
 *     summary: Create a new farmer profile
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - password
 *               - idDocumentNumber
 *               - farmerProfile
 *             properties:
 *               fullName:
 *                 type: string
 *                 maxLength: 200
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 pattern: '^\+\d{12,15}$'
 *               password:
 *                 type: string
 *                 minLength: 8
 *               idDocumentNumber:
 *                 type: string
 *               farmerProfile:
 *                 type: object
 *                 required:
 *                   - location
 *                   - farmType
 *                 properties:
 *                   location:
 *                     type: string
 *                     maxLength: 200
 *                   farmType:
 *                     type: string
 *                     enum: [crop, livestock]
 *                   cooperativeName:
 *                     type: string
 *     responses:
 *       201:
 *         description: Farmer created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not field_agent or admin)
 *       409:
 *         description: Email or phone already exists
 */

/**
 * @desc    Create a new farmer profile
 * @route   POST /api/farmers
 * @access  Private (Field Agent, Admin)
 */
async function createFarmerController(req, res, next) {
  try {
    const actorId = req.user._id;
    const farmerData = req.body;

    const farmer = await createFarmer(farmerData, actorId);

    res.status(201).json({
      status: "success",
      data: farmer,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/farmers/{id}:
 *   get:
 *     summary: Get farmer by ID
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Farmer user ID
 *     responses:
 *       200:
 *         description: Farmer retrieved successfully
 *       400:
 *         description: Invalid ObjectId format or user is not a farmer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not field_agent or admin)
 *       404:
 *         description: Farmer not found
 */

/**
 * @desc    Get farmer by ID
 * @route   GET /api/farmers/:id
 * @access  Private (Field Agent, Admin)
 */
async function getFarmerController(req, res, next) {
  try {
    const { id } = req.params;

    const farmer = await getFarmerById(id);

    res.status(200).json({
      status: "success",
      data: farmer,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/farmers/{id}:
 *   patch:
 *     summary: Update farmer profile
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Farmer user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 maxLength: 200
 *               phone:
 *                 type: string
 *                 pattern: '^\+\d{12,15}$'
 *               idDocumentNumber:
 *                 type: string
 *               paymentDetails:
 *                 type: object
 *                 properties:
 *                   momoNumber:
 *                     type: string
 *                   bankAccount:
 *                     type: string
 *               farmerProfile:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: string
 *                     maxLength: 200
 *                   farmType:
 *                     type: string
 *                     enum: [crop, livestock]
 *                   cooperativeName:
 *                     type: string
 *     responses:
 *       200:
 *         description: Farmer updated successfully
 *       400:
 *         description: Invalid ObjectId format, user is not a farmer, or role update attempted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not field_agent or admin)
 *       404:
 *         description: Farmer not found
 *       409:
 *         description: Phone number already exists
 */

/**
 * @desc    Update farmer profile
 * @route   PATCH /api/farmers/:id
 * @access  Private (Field Agent, Admin)
 */
async function updateFarmerController(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user._id;
    const updateData = req.body;

    const farmer = await updateFarmer(id, updateData, actorId);

    res.status(200).json({
      status: "success",
      data: farmer,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/farmers:
 *   get:
 *     summary: List all farmers with pagination
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of farmers
 *       400:
 *         description: Invalid pagination parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not field_agent or admin)
 */

/**
 * @desc    List all farmers with pagination
 * @route   GET /api/farmers
 * @access  Private (Field Agent, Admin)
 */
async function listFarmersController(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listFarmers(page, limit);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

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
  createFarmerController,
  getFarmerController,
  updateFarmerController,
  listFarmersController,
};
