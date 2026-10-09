/**
 * Investments Controller — thin adapters
 * @see .kiro/specs/investor-kyc-profile/design.md
 */

const kycService = require("../kyc/kyc.service");

async function confirmInvestment(req, res, next) {
  try {
    const result = await kycService.confirmInvestment(
      req.params.id,
      req.user._id,
      req.user.role
    );
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  confirmInvestment,
};
