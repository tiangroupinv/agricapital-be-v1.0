const User = require("../users/users.model");
const { hashPassword, comparePassword } = require("../../utils/hash");
const { signToken } = require("../../utils/jwt");
const ApiError = require("../../utils/apiError");
const { ROLES } = require("../../constants");

// Required fields for signup
const REQUIRED_FIELDS = ["role", "fullName", "email", "phone", "password", "idDocumentNumber"];

/**
 * Validate required fields
 * @param {Object} data - Data to validate
 * @throws {ApiError} If required field is missing
 */
function validateRequiredFields(data) {
  const missing = REQUIRED_FIELDS.filter((field) => !data[field]);
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missing.join(", ")}`);
  }
}

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and token
 */
async function signup(userData) {
  // Validate required fields
  validateRequiredFields(userData);

  const { role, fullName, email, phone, password, idDocumentNumber, farmerProfile } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, "Email already registered");
    }
    throw new ApiError(409, "Phone number already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await User.create({
    role,
    fullName,
    email,
    phone,
    passwordHash,
    idDocumentNumber,
    farmerProfile: role === ROLES.FARMER ? farmerProfile : undefined,
  });

  // Generate token
  const token = signToken({ userId: user._id, role: user.role });

  return {
    user: {
      _id: user._id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      kycStatus: user.kycStatus,
      farmerProfile: user.farmerProfile,
    },
    token,
  };
}

/**
 * Authenticate user and return token
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User and token
 */
async function login(email, password) {
  // Validate inputs
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user and include passwordHash
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(401, "Your account has been deactivated");
  }

  // Compare password
  const isMatch = await comparePassword(password, user.passwordHash);

  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate token
  const token = signToken({ userId: user._id, role: user.role });

  return {
    user: {
      _id: user._id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      kycStatus: user.kycStatus,
      farmerProfile: user.farmerProfile,
    },
    token,
  };
}

/**
 * Get current authenticated user
 * @param {string} userId - User ID from token
 * @returns {Promise<Object>} User object
 */
async function getMe(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    _id: user._id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    kycStatus: user.kycStatus,
    idDocumentNumber: user.idDocumentNumber,
    paymentDetails: user.paymentDetails,
    farmerProfile: user.farmerProfile,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  signup,
  login,
  getMe,
};
