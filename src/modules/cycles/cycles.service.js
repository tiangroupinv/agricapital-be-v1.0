const Cycle = require("./cycles.model");
const User = require("../users/users.model");
const ApiError = require("../../utils/apiError");
const { CYCLE_STATUS, CYCLE_TRANSITIONS, ROLES } = require("../../constants");

/**
 * Validate that a user exists and has the correct role
 * @param {string} userId - User ID to validate
 * @param {string} expectedRole - Expected role (optional)
 * @returns {Promise<Object>} User document
 */
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
 * Get cycle by ID
 * @param {string} cycleId - Cycle ID
 * @returns {Promise<Object>} Cycle document
 */
async function getCycleById(cycleId) {
  const cycle = await Cycle.findById(cycleId)
    .populate("farmerId", "fullName email phone farmerProfile")
    .populate("fieldAgentIds", "fullName email phone");

  if (!cycle) {
    throw new ApiError(404, "Cycle not found");
  }

  return cycle;
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
};
