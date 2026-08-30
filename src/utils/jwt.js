const jwt = require("jsonwebtoken");

/**
 * Sign a JWT token
 * @param {Object} payload - Data to encode (e.g., { userId, role })
 * @returns {string} Signed JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  signToken,
  verifyToken,
};
