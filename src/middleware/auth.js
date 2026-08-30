const { verifyToken } = require("../utils/jwt");
const User = require("../modules/users/users.model");
const ApiError = require("../utils/apiError");

/**
 * Protect routes - Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function protect(req, res, next) {
  try {
    // 1. Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ApiError(401, "You are not logged in. Please log in to access this resource."));
    }

    // 2. Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return next(new ApiError(401, "Invalid token. Please log in again."));
    }

    // 3. Check if user still exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new ApiError(401, "The user belonging to this token no longer exists."));
    }

    // 4. Check if user is active
    if (!user.isActive) {
      return next(new ApiError(401, "Your account has been deactivated."));
    }

    // 5. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Middleware function
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You do not have permission to perform this action.")
      );
    }
    next();
  };
}

module.exports = {
  protect,
  authorize,
};
