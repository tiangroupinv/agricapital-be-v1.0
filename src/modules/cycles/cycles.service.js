const Cycle = require("./cycles.model");
const User = require("../users/users.model");
const AuditLog = require("../auditLogs/auditLogs.model");
const Investment = require("../investments/investments.model");
const ProgressUpdate = require("../progressUpdates/progressUpdates.model");
const ApiError = require("../../utils/apiError");
const { PLATFORM_FEE_RATE, BROKERAGE_FEE_RATE } = require("../../config/fees");
const {
  CYCLE_STATUS,
  CYCLE_TRANSITIONS,
  ROLES,
  BUYER_TYPES_LIST,
  INVESTMENT_STATUS,
  CLAIM_STATUS,
} = require("../../constants");

/**
 * Cycle statuses visible on the investor detail page.
 * Mirrors investor discovery (funding → completed) plus closed,
 * which investors track while their payouts are being processed.
 */
const INVESTOR_VISIBLE_STATUSES = [
  CYCLE_STATUS.FUNDING,
  CYCLE_STATUS.FUNDED,
  CYCLE_STATUS.IN_PROGRESS,
  CYCLE_STATUS.COMPLETED,
  CYCLE_STATUS.CLOSED,
];
async function validateUser(userId, expectedRole = null) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (!user.isActive) {
    throw new ApiError(400, "User account is deactivated");
  }
  if (expectedRole && user.role !== expectedRole) {
    throw new ApiError(400, `User must have role '${expectedRole}', got '${user.role}'`);
  }
  return user;
}

/**
 * Validate status transition
 * @param {string} currentStatus - Current cycle status
 * @param {string} newStatus - Target status
 * @throws {ApiError} If transition is not allowed
 */
function validateTransition(currentStatus, newStatus) {
  const allowedTransitions = CYCLE_TRANSITIONS[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    throw new ApiError(
      400,
      `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(", ") || "none"}`
    );
  }
}

/**
 * Validate cycle data for creation/update
 * @param {Object} data - Cycle data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 */
function validateCycleData(data, isUpdate = false) {
  // Validate targetAmount
  if (data.targetAmount !== undefined) {
    if (data.targetAmount < 10000) {
      throw new ApiError(400, "Target amount must be at least 10,000 RWF");
    }
  }

  // Validate dates
  if (data.expectedStartDate && data.expectedEndDate) {
    const start = new Date(data.expectedStartDate);
    const end = new Date(data.expectedEndDate);
    if (end <= start) {
      throw new ApiError(400, "Expected end date must be after start date");
    }
  }

  // Validate expectedStartDate is not in the past (for creation)
  if (!isUpdate && data.expectedStartDate) {
    const start = new Date(data.expectedStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      throw new ApiError(400, "Expected start date cannot be in the past");
    }
  }
}

/**
 * Check if cycle has all required fields for submission
 * @param {Object} cycle - Cycle document
 * @returns {boolean}
 */
function canSubmitForReview(cycle) {
  return !!(cycle.farmerId && cycle.type && cycle.purpose && cycle.targetAmount && cycle.location);
}

/**
 * Check if cycle has off-taker agreement for approval
 * @param {Object} cycle - Cycle document
 * @returns {boolean}
 */
function canApprove(cycle) {
  const agreement = cycle.offTakerAgreement;
  return !!(
    agreement &&
    agreement.buyerName &&
    agreement.buyerType &&
    agreement.product &&
    agreement.pricePerUnit &&
    agreement.quantity
  );
}

/**
 * Percentage of targetAmount currently funded.
 */
function fundingPercent(fundedAmount, targetAmount) {
  if (!targetAmount) return 0;
  return Math.min(100, Math.round((fundedAmount / targetAmount) * 100));
}

/**
 * Farmer summary for the investor cycle detail page.
 * Deliberately excludes PII/contact fields (email, phone, idDocumentNumber, kycStatus).
 * @param {Object} farmer - Populated farmer user document (or null)
 * @returns {Object|null}
 */
function farmerSummary(farmer) {
  if (!farmer) return null;
  return {
    _id: farmer._id,
    fullName: farmer.fullName,
    ...(farmer.farmerProfile
      ? {
          farmLocation: farmer.farmerProfile.location,
          farmType: farmer.farmerProfile.farmType,
          cooperativeName: farmer.farmerProfile.cooperativeName,
        }
      : {}),
  };
}

/**
 * Off-taker agreement summary for the investor dashboard page.
 * Excludes the internal contract document URL.
 * @param {Object} agreement - cycle.offTakerAgreement
 */
function offTakerAgreementSummary(agreement) {
  if (!agreement) return null;
  const { buyerName, buyerType, product, pricePerUnit, quantity, contractReference } = agreement;
  return { buyerName, buyerType, product, pricePerUnit, quantity, contractReference };
}

/**
 * Insurance status summary for the investor dashboard page.
 * Exposes coverage status + active claim count, never claim details or policyReference.
 * @param {Object} insurance - cycle.insurance
 */
function insuranceSummary(insurance) {
  if (!insurance) return null;
  const activeClaims = Array.isArray(insurance.claims)
    ? insurance.claims.filter(
        (claim) =>
          claim.claimStatus !== CLAIM_STATUS.REJECTED &&
          claim.claimStatus !== CLAIM_STATUS.PAID
      ).length
    : 0;
  return {
    naisCovered: insurance.naisCovered,
    insurerName: insurance.insurerName,
    coverageStartDate: insurance.coverageStartDate,
    coverageEndDate: insurance.coverageEndDate,
    activeClaims,
  };
}

/**
 * Aggregated funding totals from confirmed investments only.
 * pending/failed/refunded investments never contribute to funding progress.
 * @param {string} cycleId
 * @returns {Promise<{fundedAmount: number, investorCount: number}>}
 */
async function confirmedFundingSummary(cycleId) {
  const [row] = await Investment.aggregate([
    { $match: { cycleId: cycleId, status: INVESTMENT_STATUS.CONFIRMED } },
    {
      $group: {
        _id: null,
        fundedAmount: { $sum: "$amount" },
        investorIds: { $addToSet: "$investorId" },
      },
    },
    {
      $project: {
        fundedAmount: 1,
        investorCount: { $size: "$investorIds" },
      },
    },
  ]);
  if (!row) return { fundedAmount: 0, investorCount: 0 };
  return {
    fundedAmount: row.fundedAmount,
    investorCount: row.investorCount,
  };
}

/**
 * Expected net return range for an investor in a cycle.
 *
 * Gross proceeds come from the off-taker agreement estimate (pricePerUnit × quantity)
 * when the cycle is in funding/funded (pre-sale), or from finalSaleAmount once complete.
 * Net = gross × (1 − platformFee − brokerageFee), using the fee bands from config/fees.
 *
 * Returns null when no proceeds basis exists.
 * @param {Object} cycle - Cycle document
 * @returns {Object|null} { proceedsAmount, proceedsSource, netReturnRange, fees }
 */
function buildExpectedReturns(cycle) {
  let proceeds = cycle.finalSaleAmount;
  let proceedsSource = "final_sale";

  if (proceeds === null || proceeds === undefined) {
    const { pricePerUnit, quantity } = cycle.offTakerAgreement || {};
    if (pricePerUnit && quantity) {
      proceeds = pricePerUnit * quantity;
      proceedsSource = "off_taker_estimate";
    }
  }

  if (!proceeds) return null;

  const netMin = Math.round(
    proceeds * (1 - PLATFORM_FEE_RATE.MAX - BROKERAGE_FEE_RATE.MAX)
  );
  const netMax = Math.round(
    proceeds * (1 - PLATFORM_FEE_RATE.MIN - BROKERAGE_FEE_RATE.MIN)
  );

  return {
    proceedsAmount: proceeds,
    proceedsSource,
    fees: {
      platformFeeRate: { ...PLATFORM_FEE_RATE },
      brokerageFeeRate: { ...BROKERAGE_FEE_RATE },
    },
    netReturnRange: { min: netMin, max: netMax },
  };
}

/**
 * Build the investor-facing timeline: key cycle dates plus progress updates,
 * sorted ascending by date.
 * @param {Object} cycle - Cycle document
 * @param {Array} updates - progress update documents for the cycle
 */
function buildTimeline(cycle, updates) {
  const events = [];

  if (cycle.createdAt) {
    events.push({ date: cycle.createdAt, type: "cycle_created", description: "Cycle created" });
  }
  if (cycle.approvedAt) {
    events.push({ date: cycle.approvedAt, type: "approved", description: "Cycle approved by platform" });
  }
  if (cycle.completedAt) {
    events.push({ date: cycle.completedAt, type: "completed", description: "Cycle completed" });
  }

  for (const update of updates) {
    events.push({
      date: update.visitDate,
      type: "progress_update",
      updateType: update.updateType,
      description: update.notes,
      photos: update.photoUrls,
    });
  }

  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Project a cycle into the investor detail view.
 * @param {Object} cycle - Cycle document with farmer populated
 * @param {Object} funding - { fundedAmount, investorCount } from confirmed investments
 * @param {Array} updates - progress update documents
 */
function buildInvestorDetail(cycle, funding, updates) {
  const { fundedAmount, investorCount } = funding;
  const cycleObj = cycle.toObject();

  return {
    _id: cycleObj._id,
    type: cycleObj.type,
    purpose: cycleObj.purpose,
    status: cycleObj.status,
    location: cycleObj.location,
    targetAmount: cycleObj.targetAmount,
    fundedAmount,
    fundingProgress: {
      fundedAmount,
      targetAmount: cycleObj.targetAmount,
      percent: fundingPercent(fundedAmount, cycleObj.targetAmount),
      investorCount,
      isFullyFunded: fundedAmount >= cycleObj.targetAmount,
    },
    farmer: farmerSummary(cycleObj.farmerId),
    offTakerAgreement: offTakerAgreementSummary(cycleObj.offTakerAgreement),
    insurance: insuranceSummary(cycleObj.insurance),
    expectedReturns: buildExpectedReturns(cycleObj),
    timeline: buildTimeline(cycleObj, updates),
    expectedStartDate: cycleObj.expectedStartDate,
    expectedEndDate: cycleObj.expectedEndDate,
    createdAt: cycleObj.createdAt,
  };
}

/**
 * Create a new cycle (draft status)
 * @param {string} userId - ID of user creating the cycle
 * @param {Object} data - Cycle data
 * @returns {Promise<Object>} Created cycle
 */
async function createCycle(userId, data) {
  // Validate user is field_agent or admin
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (!user.isActive) {
    throw new ApiError(400, "User account is deactivated");
  }
  if (user.role !== ROLES.FIELD_AGENT && user.role !== ROLES.ADMIN) {
    throw new ApiError(403, "Only field agents or admins can create cycles");
  }

  // Validate farmerId is provided
  if (!data.farmerId) {
    throw new ApiError(400, "farmerId is required");
  }

  // Validate farmer exists and is a farmer
  await validateUser(data.farmerId, ROLES.FARMER);

  // Validate cycle data
  validateCycleData(data);

  // Create cycle with creator assigned
  const cycle = await Cycle.create({
    ...data,
    fieldAgentIds: [userId],
    status: CYCLE_STATUS.DRAFT,
    fundedAmount: 0,
  });

  return cycle;
}

/**
 * Update a cycle (only in draft status)
 * @param {string} cycleId - Cycle ID
 * @param {string} userId - User ID making the update
 * @param {string} userRole - Role of user
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated cycle
 */
async function updateCycle(cycleId, userId, userRole, data) {
  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Check if user owns this cycle (field agent) or is admin
  if (userRole !== ROLES.ADMIN) {
    if (!cycle.fieldAgentIds.map(String).includes(String(userId))) {
      throw new ApiError(403, "You can only update cycles assigned to you");
    }
  }

  // Can only update if in draft status
  if (cycle.status !== CYCLE_STATUS.DRAFT) {
    throw new ApiError(400, `Cannot update cycle with status '${cycle.status}'. Only drafts can be updated.`);
  }

  // Validate update data
  validateCycleData(data, true);

  // If changing farmer, validate new farmer
  if (data.farmerId && data.farmerId !== String(cycle.farmerId)) {
    await validateUser(data.farmerId, ROLES.FARMER);
  }

  // Prevent status changes via update
  delete data.status;
  delete data.fundedAmount;

  const updatedCycle = await Cycle.findByIdAndUpdate(cycleId, data, {
    new: true,
    runValidators: true,
  });

  return updatedCycle;
}

/**
 * Submit cycle for review (draft → under_review)
 * @param {string} cycleId - Cycle ID
 * @param {string} userId - User ID submitting
 * @returns {Promise<Object>} Updated cycle
 */
async function submitForReview(cycleId, userId) {
  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Check ownership
  if (!cycle.fieldAgentIds.map(String).includes(String(userId))) {
    throw new ApiError(403, "Only assigned field agents can submit cycles for review");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.UNDER_REVIEW);

  // Validate required fields
  if (!canSubmitForReview(cycle)) {
    throw new ApiError(400, "Cycle must have farmer, type, purpose, target amount, and location filled in");
  }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    { status: CYCLE_STATUS.UNDER_REVIEW },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Approve a cycle (under_review → approved)
 * @param {string} cycleId - Cycle ID
 * @param {string} adminId - Admin user ID
 * @returns {Promise<Object>} Updated cycle
 */
async function approveCycle(cycleId, adminId) {
  // Validate admin
  await validateUser(adminId, ROLES.ADMIN);

  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.APPROVED);

  // Check for off-taker agreement
  if (!canApprove(cycle)) {
    throw new ApiError(400, "Off-taker agreement must be complete before approval");
  }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    {
      status: CYCLE_STATUS.APPROVED,
      approvedAt: new Date(),
    },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Reject a cycle (under_review → cancelled)
 * @param {string} cycleId - Cycle ID
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated cycle
 */
async function rejectCycle(cycleId, adminId, reason) {
  // Validate admin
  await validateUser(adminId, ROLES.ADMIN);

  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.CANCELLED);

  if (!reason) {
    throw new ApiError(400, "Rejection reason is required");
  }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    {
      status: CYCLE_STATUS.CANCELLED,
      cancellationReason: reason,
    },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Publish cycle for funding (approved → funding)
 * @param {string} cycleId - Cycle ID
 * @param {string} adminId - Admin user ID
 * @returns {Promise<Object>} Updated cycle
 */
async function publishForFunding(cycleId, adminId) {
  // Validate admin
  await validateUser(adminId, ROLES.ADMIN);

  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.FUNDING);

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    { status: CYCLE_STATUS.FUNDING },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Cancel a cycle (any status → cancelled)
 * @param {string} cycleId - Cycle ID
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Updated cycle
 */
async function cancelCycle(cycleId, adminId, reason) {
  // Validate admin
  await validateUser(adminId, ROLES.ADMIN);

  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Check if transition to cancelled is allowed
  validateTransition(cycle.status, CYCLE_STATUS.CANCELLED);

  if (!reason) {
    throw new ApiError(400, "Cancellation reason is required");
  }

  // TODO: In future, check if investments need to be refunded
  // if (cycle.fundedAmount > 0) { ... refund logic ... }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    {
      status: CYCLE_STATUS.CANCELLED,
      cancellationReason: reason,
    },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Mark cycle as funded (funding → funded)
 * Called automatically when fundedAmount reaches targetAmount
 * @param {string} cycleId - Cycle ID
 * @returns {Promise<Object>} Updated cycle
 */
async function markFunded(cycleId) {
  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.FUNDED);

  // Validate funded amount
  if (cycle.fundedAmount < cycle.targetAmount) {
    throw new ApiError(400, "Cycle is not fully funded yet");
  }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    { status: CYCLE_STATUS.FUNDED },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Start cycle (funded → in_progress)
 * Called automatically when first disbursement is created
 * @param {string} cycleId - Cycle ID
 * @returns {Promise<Object>} Updated cycle
 */
async function startCycle(cycleId) {
  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.IN_PROGRESS);

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    { status: CYCLE_STATUS.IN_PROGRESS },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Complete cycle (in_progress → completed)
 * @param {string} cycleId - Cycle ID
 * @param {string} adminId - Admin user ID
 * @param {number} finalSaleAmount - Final sale amount
 * @returns {Promise<Object>} Updated cycle
 */
async function completeCycle(cycleId, adminId, finalSaleAmount) {
  // Validate admin
  await validateUser(adminId, ROLES.ADMIN);

  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.COMPLETED);

  if (!finalSaleAmount || finalSaleAmount < 0) {
    throw new ApiError(400, "Valid final sale amount is required");
  }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    {
      status: CYCLE_STATUS.COMPLETED,
      finalSaleAmount,
      completedAt: new Date(),
    },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Close cycle (completed → closed)
 * Called automatically when all payouts are processed
 * @param {string} cycleId - Cycle ID
 * @returns {Promise<Object>} Updated cycle
 */
async function closeCycle(cycleId) {
  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Validate transition
  validateTransition(cycle.status, CYCLE_STATUS.CLOSED);

  // TODO: In future, validate all payouts are processed
  // const payouts = await Payout.find({ cycleId, status: { $ne: 'processed' } });
  // if (payouts.length > 0) { throw error }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    { status: CYCLE_STATUS.CLOSED },
    { new: true }
  );

  return updatedCycle;
}

/**
 * Set or update off-taker agreement for a cycle
 * @param {string} userId - Admin user ID
 * @param {string} cycleId - Cycle ID
 * @param {Object} agreementData - Off-taker agreement data
 * @returns {Promise<Object>} Updated cycle
 */
async function setOffTakerAgreement(userId, cycleId, agreementData) {
  // Validate admin
  await validateUser(userId, ROLES.ADMIN);

  const cycle = await Cycle.findById(cycleId);
  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  // Capture old value for audit
  const oldValue = cycle.offTakerAgreement || null;

  // Validate required fields
  if (!agreementData.buyerName) {
    throw new ApiError(400, "buyerName is required");
  }
  if (!agreementData.buyerType) {
    throw new ApiError(400, "buyerType is required");
  }
  if (!agreementData.product) {
    throw new ApiError(400, "product is required");
  }

  // Validate numeric fields
  if (agreementData.pricePerUnit !== undefined && agreementData.pricePerUnit < 0) {
    throw new ApiError(400, "pricePerUnit must be non-negative");
  }
  if (agreementData.quantity !== undefined && agreementData.quantity < 0) {
    throw new ApiError(400, "quantity must be non-negative");
  }

  // Validate buyerType is a valid enum
  if (!BUYER_TYPES_LIST.includes(agreementData.buyerType)) {
    throw new ApiError(400, `Invalid buyerType. Must be one of: ${BUYER_TYPES_LIST.join(", ")}`);
  }

  const updatedCycle = await Cycle.findByIdAndUpdate(
    cycleId,
    { $set: { offTakerAgreement: agreementData } },
    { new: true }
  );

  // Audit log
  await AuditLog.create({
    actorId: userId,
    action: "cycle.agreement_updated",
    entityType: "cycle",
    entityId: cycleId,
    oldValue: oldValue,
    newValue: agreementData,
  });

  return updatedCycle;
}

/**
 * Get all cycles with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Cycles and pagination info
 */
async function getCycles(filters = {}, pagination = {}) {
  const { status, farmerId, fieldAgentId, type, purpose } = filters;
  const { page = 1, limit = 20 } = pagination;

  const query = {};
  if (status) query.status = status;
  if (farmerId) query.farmerId = farmerId;
  if (fieldAgentId) query.fieldAgentIds = fieldAgentId;
  if (type) query.type = type;
  if (purpose) query.purpose = purpose;

  const skip = (page - 1) * limit;

  const [cycles, total] = await Promise.all([
    Cycle.find(query)
      .populate("farmerId", "fullName email phone")
      .populate("fieldAgentIds", "fullName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Cycle.countDocuments(query),
  ]);

  return {
    cycles,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get investable cycles for investor discovery
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination options
 * @param {Object} sort - Sort options
 * @returns {Promise<Object>} Cycles and pagination info
 */
async function getInvestableCycles(filters = {}, pagination = {}, sort = {}) {
  const { type, purpose, minTarget, maxTarget, location, buyerType } = filters;
  const { page = 1, limit = 20 } = pagination;
  const { sortBy = "createdAt", sortOrder = "desc" } = sort;

  // Only show investor-visible statuses
  const INVESTABLE_STATUSES = [
    CYCLE_STATUS.FUNDING,
    CYCLE_STATUS.FUNDED,
    CYCLE_STATUS.IN_PROGRESS,
    CYCLE_STATUS.COMPLETED,
  ];

  // Build query
  const query = {
    status: { $in: INVESTABLE_STATUSES },
  };

  // Apply filters
  if (type) query.type = type;
  if (purpose) query.purpose = purpose;
  if (minTarget !== undefined || maxTarget !== undefined) {
    query.targetAmount = {};
    if (minTarget !== undefined) query.targetAmount.$gte = minTarget;
    if (maxTarget !== undefined) query.targetAmount.$lte = maxTarget;
  }
  if (location) {
    query.location = { $regex: location, $options: "i" };
  }
  if (buyerType) {
    query["offTakerAgreement.buyerType"] = buyerType;
  }

  // Pagination
  const skip = (page - 1) * limit;
  const cappedLimit = Math.min(limit, 100);

  // Sorting (stable sort with createdAt as tiebreaker)
  const sortField = sortBy === "targetAmount" || sortBy === "fundedAmount" ? sortBy : "createdAt";
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortObj = { [sortField]: sortDirection, createdAt: -1 };

  const [cycles, total] = await Promise.all([
    Cycle.find(query)
      .populate("farmerId", "fullName farmerProfile.location")
      .select(
        "type purpose targetAmount fundedAmount location expectedStartDate expectedEndDate status offTakerAgreement insurance createdAt"
      )
      .sort(sortObj)
      .skip(skip)
      .limit(cappedLimit),
    Cycle.countDocuments(query),
  ]);

  // Add funding progress to each cycle
  const cyclesWithProgress = cycles.map((cycle) => {
    const cycleObj = cycle.toObject();
    cycleObj.fundingProgress =
      cycle.targetAmount > 0
        ? Math.round((cycle.fundedAmount / cycle.targetAmount) * 100)
        : 0;
    return cycleObj;
  });

  return {
    cycles: cyclesWithProgress,
    pagination: {
      page,
      limit: cappedLimit,
      total,
      pages: Math.ceil(total / cappedLimit),
    },
  };
}

/**
 * Get cycle by ID.
 * Investors receive the purpose-built investor detail view; all other roles
 * receive the full cycle document (with populated farmer and field agents).
 * @param {string} cycleId - Cycle ID
 * @param {Object} [viewer] - { _id, role } of the authenticated user
 * @returns {Promise<Object>} Cycle document or investor detail view
 */
async function getCycleById(cycleId, viewer = null) {
  const cycle = await Cycle.findById(cycleId)
    .populate("farmerId", "fullName email phone farmerProfile")
    .populate("fieldAgentIds", "fullName email phone");

  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  const isInvestorViewer = viewer && viewer.role === ROLES.INVESTOR;
  if (!isInvestorViewer) {
    return cycle;
  }

  // Investors can only see investor-visible statuses — a 404 avoids leaking
  // the existence of internal/not-yet-published cycles.
  if (!INVESTOR_VISIBLE_STATUSES.includes(cycle.status)) {
    throw new ApiError(404, "Cycle not found");
  }

  const [funding, updates] = await Promise.all([
    confirmedFundingSummary(cycleId),
    ProgressUpdate.find({ cycleId })
      .select("updateType notes photoUrls visitDate")
      .sort({ visitDate: 1 })
      .lean(),
  ]);

  return buildInvestorDetail(cycle, funding, updates);
}

module.exports = {
  createCycle,
  updateCycle,
  submitForReview,
  approveCycle,
  rejectCycle,
  publishForFunding,
  cancelCycle,
  markFunded,
  startCycle,
  completeCycle,
  closeCycle,
  getCycles,
  getCycleById,
  getInvestableCycles,
  setOffTakerAgreement,
};
