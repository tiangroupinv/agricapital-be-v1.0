/**
 * KYC Controller — thin HTTP adapters
 * @see .kiro/specs/investor-kyc-profile/design.md
 */

const kycService = require("./kyc.service");

async function submitKycProfile(req, res, next) {
  try {
    const result = await kycService.submitKycProfile(
      req.user._id,
      req.user.role,
      req.params.id,
      req.body
    );
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
}

async function getKycProfile(req, res, next) {
  try {
    const result = await kycService.getKycProfile(
      req.user._id,
      req.user.role,
      req.params.id
    );
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
}

async function updateKycStatus(req, res, next) {
  try {
    const result = await kycService.updateKycStatus(
      req.user._id,
      req.params.id,
      req.body.kycStatus
    );
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitKycProfile,
  getKycProfile,
  updateKycStatus,
};
