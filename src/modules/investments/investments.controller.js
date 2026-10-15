/**
 * Investments Controller — thin adapters
 * @see .kiro/specs/investor-investment-apis/design.md
 */

const investmentsService = require("./investments.service");

async function createInvestment(req, res, next) {
  try {
    const investorId = req.user._id;
    const { cycleId, amount, paymentMethod, transactionReference } = req.body;
    
    const investment = await investmentsService.initiateInvestment(investorId, cycleId, {
      amount,
      paymentMethod,
      transactionReference,
    });
    
    res.status(201).json({ status: "success", data: investment });
  } catch (error) {
    next(error);
  }
}

async function confirmInvestment(req, res, next) {
  try {
    const result = await investmentsService.confirmInvestment(
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
  createInvestment,
  confirmInvestment,
};
