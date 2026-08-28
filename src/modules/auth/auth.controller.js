const authService = require("./auth.service");

/**
 * @desc    Register new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
async function signup(req, res, next) {
  try {
    const result = await authService.signup(req.body);

    res.status(201).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc    Get current authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user._id);

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signup,
  login,
  getMe,
};
