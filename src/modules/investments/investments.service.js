/**
 * Investments Service
 * Core business logic for investment lifecycle
 * @see .kiro/specs/investor-investment-apis/design.md
 */

const User = require("../users/users.model");
const Cycle = require("../cycles/cycles.model");
const Investment = require("./investments.model");
const AuditLog = require("../auditLogs/auditLogs.model");
const ApiError = require("../../utils/apiError");
const {
  INVESTMENT_STATUS,
  PAYMENT_METHODS_LIST,
  KYC_STATUS,
  CYCLE_STATUS,
  ROLES,
} = require("../../constants");

// Helper: Build KYC error message based on status
function buildKycErrorMessage(kycStatus) {
  switch (kycStatus) {
    case KYC_STATUS.PENDING:
      return "Investor KYC status is 'pending'. Please complete verification before investing.";
    case KYC_STATUS.REJECTED:
      return "Investor KYC status is 'rejected'. Please contact support to resolve this issue.";
    default:
      return "Investor KYC status is not verified. Please complete verification before investing.";
  }
}

// Helper: Build funding cap error message
function buildFundingCapErrorMessage(amount, cycle) {
  return `Investment of ${amount} would exceed cycle targetAmount of ${cycle.targetAmount} (fundedAmount: ${cycle.fundedAmount})`;
}

/**
 * Fire-and-forget audit log writer
 * Errors are logged but don't throw - audit logging should never block business logic
 * @param {Object} logData - Audit log data
 * @param {mongoose.ClientSession|null} session - Optional MongoDB session for transactions
 */
async function writeAuditLog(logData, session = null) {
  try {
    const options = session ? { session } : {};
    await AuditLog.create([logData], options);
  } catch (error) {
    // Log error but don't throw - audit failure shouldn't break the main flow
    console.error("Audit log write failed:", error.message, logData);
  }
}

/**
 * Check if investment would exceed cycle's funding cap
 * @param {String} cycleId - Cycle ObjectId
 * @param {Number} amount - Investment amount
 * @returns {Promise<{wouldExceed: Boolean, errorMessage: String|null, cycle: Object}>}
 */
async function checkFundingCap(cycleId, amount) {
  const cycle = await Cycle.findById(cycleId).select("fundedAmount targetAmount").lean();
  if (!cycle) {
    return { wouldExceed: true, errorMessage: "Cycle not found", cycle: null };
  }
  
  const wouldExceed = cycle.fundedAmount + amount > cycle.targetAmount;
  const errorMessage = wouldExceed 
    ? buildFundingCapErrorMessage(amount, cycle) 
    : null;
  
  return { wouldExceed, errorMessage, cycle };
}

/**
 * Atomically update cycle.fundedAmount with race condition prevention
 * Uses findOneAndUpdate with proper filtering to ensure atomicity
 * @param {String} cycleId - Cycle ObjectId
 * @param {Number} amount - Amount to increment
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<Object>} Updated cycle document
 */
async function updateCycleFundedAmount(cycleId, amount, session) {
  const sessionOption = process.env.NODE_ENV === "test" ? undefined : { session };
  const updatedCycle = await Cycle.findOneAndUpdate(
    {
      _id: cycleId,
      status: { $in: [CYCLE_STATUS.FUNDING, CYCLE_STATUS.FUNDED] },
      $expr: { $lt: ["$fundedAmount", "$targetAmount"] },
    },
    { $inc: { fundedAmount: amount } },
    { new: true, ...sessionOption }
  );

  if (!updatedCycle) {
    throw new ApiError(400, "Cycle is no longer in investable status or funding cap exceeded");
  }

  // Double-check: fundedAmount must never exceed targetAmount
  if (updatedCycle.fundedAmount > updatedCycle.targetAmount) {
    throw new ApiError(400, "Funding cap exceeded after atomic update");
  }

  return updatedCycle;
}

/**
 * Mark cycle as fully funded when targetAmount is reached
 * @param {String} cycleId - Cycle ObjectId
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<Object>} Updated cycle document
 */
async function markCycleFunded(cycleId, session) {
  const sessionOption = process.env.NODE_ENV === "test" ? undefined : session;
  const cycle = await Cycle.findById(cycleId).session(sessionOption);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }
  if (cycle.status !== CYCLE_STATUS.FUNDING) {
    throw new ApiError(400, `Cycle must be in 'funding' status to mark as 'funded'. Current status: ${cycle.status}`);
  }
  if (cycle.fundedAmount < cycle.targetAmount) {
    throw new ApiError(400, "Cycle is not fully funded yet");
  }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    { status: CYCLE_STATUS.FUNDED },
    { new: true, ...sessionOption }
  );

  // Create audit log for automatic status transition
  await writeAuditLog({
    actorId: null, // System action
    action: "cycle.status_auto_transitioned",
    entityType: "cycle",
    entityId: cycleId,
    oldValue: { status: CYCLE_STATUS.FUNDING },
    newValue: { status: CYCLE_STATUS.FUNDED },
  }, session);

  return updatedCycle;
}

/**
 * Initiate a new investment (creates pending investment)
 * @param {String} investorId - Investor ObjectId
 * @param {String} cycleId - Cycle ObjectId
 * @param {Object} data - Investment data {amount, paymentMethod, transactionReference}
 * @returns {Promise<Object>} Created investment document
 */
async function initiateInvestment(investorId, cycleId, data) {
  const { amount, paymentMethod, transactionReference } = data;

  // Step 1: Validate investor exists and is active
  const investor = await User.findById(investorId);
  if (!investor || !investor.isActive) {
    throw new ApiError(404, "Investor not found");
  }
  if (investor.role !== ROLES.INVESTOR) {
    throw new ApiError(403, "Only investors can make investments");
  }

  // Step 2: Validate KYC status
  if (investor.kycStatus !== KYC_STATUS.VERIFIED && investor.kycStatus !== KYC_STATUS.NOT_REQUIRED) {
    throw new ApiError(400, buildKycErrorMessage(investor.kycStatus));
  }

  // Step 3: Validate cycle exists and is in investable status
  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }
  if (![CYCLE_STATUS.FUNDING, CYCLE_STATUS.FUNDED].includes(cycle.status)) {
    throw new ApiError(400, `Cycle is not in investable status. Current status: ${cycle.status}`);
  }

  // Step 4: Validate amount
  if (amount <= 0) {
    throw new ApiError(400, "Investment amount must be greater than zero");
  }

  // Step 5: Validate payment method
  if (!PAYMENT_METHODS_LIST.includes(paymentMethod)) {
    throw new ApiError(400, `Invalid payment method. Must be one of: ${PAYMENT_METHODS_LIST.join(", ")}`);
  }

  // Step 6: Validate transactionReference
  if (!transactionReference || transactionReference.trim() === "") {
    throw new ApiError(400, `transactionReference is required for ${paymentMethod}`);
  }

  // Step 7: Check for duplicate transactionReference (prevent double payment)
  const existing = await Investment.findOne({
    transactionReference,
    $or: [{ status: INVESTMENT_STATUS.PENDING }, { status: INVESTMENT_STATUS.CONFIRMED }],
  });
  if (existing) {
    throw new ApiError(409, "This transaction has already been used for an investment");
  }

  // Step 8: Check funding cap BEFORE creating investment
  const { wouldExceed, errorMessage } = await checkFundingCap(cycleId, amount);
  if (wouldExceed) {
    throw new ApiError(400, errorMessage);
  }

  // Step 9: Create investment with status "pending"
  const investment = await Investment.create({
    investorId,
    cycleId,
    amount,
    paymentMethod,
    transactionReference,
    status: INVESTMENT_STATUS.PENDING,
    confirmedAt: null,
  });

  // Step 10: Create audit log for initiation
  await writeAuditLog({
    actorId: investorId,
    action: "investment.initiated",
    entityType: "investment",
    entityId: investment._id,
    oldValue: null,
    newValue: { amount, paymentMethod, transactionReference, status: INVESTMENT_STATUS.PENDING },
  });

  return investment;
}

/**
 * Confirm an investment (pending → confirmed)
 * Updates cycle.fundedAmount atomically and marks cycle as funded if cap reached
 * @param {String} investmentId - Investment ObjectId
 * @param {String} userId - User ObjectId making the request
 * @param {String} role - User role (investor or admin)
 * @returns {Promise<Object>} {investment, cycleFunded: Boolean}
 */
async function confirmInvestment(investmentId, userId, role) {
  // Step 1: Validate investment exists and is pending
  const investment = await Investment.findById(investmentId);
  if (!investment) {
    throw new ApiError(404, "Investment not found");
  }
  if (investment.status !== INVESTMENT_STATUS.PENDING) {
    throw new ApiError(422, `Investment status must be 'pending' to confirm. Current status: ${investment.status}.`);
  }

  // Step 2: Authorization check - investor can confirm own investment; admin can confirm any
  if (role !== ROLES.ADMIN && investment.investorId.toString() !== userId.toString()) {
    throw new ApiError(403, "You do not have permission to confirm this investment.");
  }

  // Step 3: Load investor for KYC validation
  const investor = await User.findById(investment.investorId);
  if (!investor) {
    throw new ApiError(404, "Investor not found");
  }

  // Step 4: Validate investor KYC status
  if (investor.kycStatus !== KYC_STATUS.VERIFIED && investor.kycStatus !== KYC_STATUS.NOT_REQUIRED) {
    throw new ApiError(422, buildKycErrorMessage(investor.kycStatus));
  }

  // Step 5: Load cycle for funding cap check
  const cycle = await Cycle.findById(investment.cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Step 6: Check funding cap
  const wouldExceed = cycle.fundedAmount + investment.amount > cycle.targetAmount;
  if (wouldExceed) {
    throw new ApiError(400, buildFundingCapErrorMessage(investment.amount, cycle));
  }

  // Step 7: Use MongoDB session for atomic transaction (skip in test environment)
  const session = process.env.NODE_ENV === "test" ? null : await Investment.startSession();
  try {
    if (session) {
      session.startTransaction();
    }

    // Atomic update cycle.fundedAmount
    const updatedCycle = await updateCycleFundedAmount(cycle._id, investment.amount, session);

    // Update investment status to "confirmed" with confirmedAt timestamp
    const updatedInvestment = await Investment.findByIdAndUpdate(
      investmentId,
      { status: INVESTMENT_STATUS.CONFIRMED, confirmedAt: new Date() },
      { new: true, session }
    );

    // Check if cycle is now fully funded
    let cycleFunded = false;
    if (updatedCycle.fundedAmount >= updatedCycle.targetAmount && updatedCycle.status === CYCLE_STATUS.FUNDING) {
      await markCycleFunded(updatedCycle._id, session);
      cycleFunded = true;
    }

    // Create audit logs
    await writeAuditLog({
      actorId: userId,
      action: "investment.confirmed",
      entityType: "investment",
      entityId: investmentId,
      oldValue: { status: INVESTMENT_STATUS.PENDING },
      newValue: { status: INVESTMENT_STATUS.CONFIRMED, confirmedAt: new Date() },
    }, session);

    await writeAuditLog({
      actorId: userId,
      action: "cycle.funded_amount_updated",
      entityType: "cycle",
      entityId: cycle._id,
      oldValue: { fundedAmount: cycle.fundedAmount },
      newValue: { fundedAmount: updatedCycle.fundedAmount },
    }, session);

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return { investment: updatedInvestment, cycleFunded };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
}

module.exports = {
  initiateInvestment,
  confirmInvestment,
  updateCycleFundedAmount,
  markCycleFunded,
  checkFundingCap,
  writeAuditLog,
  // Export helpers for testing
  buildKycErrorMessage,
  buildFundingCapErrorMessage,
};