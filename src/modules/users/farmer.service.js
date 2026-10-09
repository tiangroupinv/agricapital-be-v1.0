const User = require("./users.model");
const AuditLog = require("../auditLogs/auditLogs.model");
const { hashPassword } = require("../../utils/hash");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");

/**
 * Create a new farmer profile
 * @param {Object} farmerData - Farmer registration data
 * @param {string} actorId - Field Agent's user ID
 * @param {Object} session - MongoDB session for transaction
 * @returns {Promise<Object>} Created farmer
 */
async function createFarmer(farmerData, actorId, session = null) {
  const { fullName, email, phone, password, idDocumentNumber, farmerProfile } = farmerData;

  // Check for duplicate email/phone
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  }).session(session);

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, "Email already registered");
    }
    throw new ApiError(409, "Phone number already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user with role='farmer', kycStatus='not_required'
  const [user] = await User.create(
    [
      {
        role: "farmer",
        fullName,
        email,
        phone,
        passwordHash,
        idDocumentNumber,
        farmerProfile,
        kycStatus: "not_required",
      },
    ],
    { session }
  );

  // Write audit log entry
  const auditLog = new AuditLog({
    actorId,
    action: "farmer.created",
    entityType: "user",
    entityId: user._id,
    newValue: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      idDocumentNumber: user.idDocumentNumber,
      kycStatus: user.kycStatus,
      farmerProfile: user.farmerProfile,
      role: user.role,
    },
  });

  await auditLog.save({ session });

  // Return created farmer without passwordHash
  const farmer = user.toObject();
  delete farmer.passwordHash;
  return farmer;
}

/**
 * Update an existing farmer profile
 * @param {string} farmerId - Farmer's user ID
 * @param {Object} updateData - Update data
 * @param {string} actorId - Field Agent's user ID
 * @param {Object} session - MongoDB session for transaction
 * @returns {Promise<Object>} Updated farmer
 */
async function updateFarmer(farmerId, updateData, actorId, session = null) {
  // Verify user exists and has role='farmer'
  const farmer = await User.findById(farmerId).session(session);

  if (!farmer) {
    throw new ApiError(404, "Farmer not found");
  }

  if (farmer.role !== "farmer") {
    throw new ApiError(400, "User is not a farmer");
  }

  // Store old value for audit log (deep clone to prevent mutation)
  const oldValue = JSON.parse(
    JSON.stringify({
      fullName: farmer.fullName,
      phone: farmer.phone,
      idDocumentNumber: farmer.idDocumentNumber,
      paymentDetails: farmer.paymentDetails,
      farmerProfile: farmer.farmerProfile,
    })
  );

  // Check for duplicate phone if being updated
  if (updateData.phone && updateData.phone !== farmer.phone) {
    const existingUser = await User.findOne({
      phone: updateData.phone,
      _id: { $ne: farmerId },
    }).session(session);

    if (existingUser) {
      throw new ApiError(409, "Phone number already registered");
    }
  }

  // Apply update (role field is already stripped by validation)
  // Handle nested objects explicitly to ensure proper updates
  Object.keys(updateData).forEach((key) => {
    if (key !== "role" && key !== "passwordHash") {
      if (key === "farmerProfile" && typeof updateData[key] === "object") {
        // For nested farmerProfile, set each field individually
        Object.keys(updateData[key]).forEach((nestedKey) => {
          farmer.set(`farmerProfile.${nestedKey}`, updateData[key][nestedKey]);
        });
      } else if (key === "paymentDetails" && typeof updateData[key] === "object") {
        // For nested paymentDetails, set each field individually
        Object.keys(updateData[key]).forEach((nestedKey) => {
          farmer.set(`paymentDetails.${nestedKey}`, updateData[key][nestedKey]);
        });
      } else {
        farmer[key] = updateData[key];
      }
    }
  });

  await farmer.save({ session });

  // Prepare newValue for audit log
  const newValue = {
    fullName: farmer.fullName,
    phone: farmer.phone,
    idDocumentNumber: farmer.idDocumentNumber,
    paymentDetails: farmer.paymentDetails,
    farmerProfile: farmer.farmerProfile,
  };

  // Write audit log entry with oldValue and newValue
  const auditLog = new AuditLog({
    actorId,
    action: "farmer.updated",
    entityType: "user",
    entityId: farmer._id,
    oldValue,
    newValue,
  });

  await auditLog.save({ session });

  // Return updated farmer without passwordHash
  const updatedFarmer = farmer.toObject();
  delete updatedFarmer.passwordHash;
  return updatedFarmer;
}

/**
 * Get a farmer by ID
 * @param {string} farmerId - Farmer's user ID
 * @returns {Promise<Object>} Farmer data
 */
async function getFarmerById(farmerId) {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(farmerId)) {
    throw new ApiError(400, "Invalid farmer ID format");
  }

  // Find user
  const farmer = await User.findById(farmerId);

  if (!farmer) {
    throw new ApiError(404, "Farmer not found");
  }

  // Verify role='farmer'
  if (farmer.role !== "farmer") {
    throw new ApiError(400, "User is not a farmer");
  }

  // Return farmer data excluding passwordHash
  const farmerData = farmer.toObject();
  delete farmerData.passwordHash;
  return farmerData;
}

/**
 * List all farmers with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated farmer list
 */
async function listFarmers(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  // Query users with role='farmer' only
  const [farmers, total] = await Promise.all([
    User.find({ role: "farmer" })
      .select("-passwordHash")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments({ role: "farmer" }),
  ]);

  return {
    farmers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  createFarmer,
  updateFarmer,
  getFarmerById,
  listFarmers,
};