const cyclesService = require("./cycles.service");
const ApiError = require("../../utils/apiError");

/**
 * Create a new cycle (draft)
 * @route POST /api/cycles
 * @access Private (field_agent, admin)
 */
async function createCycle(req, res, next) {
  try {
    const cycle = await cyclesService.createCycle(req.user._id, req.body);
    res.status(201).json({
      status: "success",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all cycles with filtering and pagination
 * @route GET /api/cycles
 * @access Private
 */
async function listCycles(req, res, next) {
  try {
    const { status, farmerId, fieldAgentId, type, purpose, page, limit } = req.query;
    
    const result = await cyclesService.getCycles(
      { status, farmerId, fieldAgentId, type, purpose },
      { page: parseInt(page) || 1, limit: parseInt(limit) || 20 }
    );
    
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get cycle by ID
 * @route GET /api/cycles/:id
 * @access Private
 */
async function getCycle(req, res, next) {
  try {
    const cycle = await cyclesService.getCycleById(req.params.id);
    res.status(200).json({
      status: "success",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a cycle (draft only)
 * @route PATCH /api/cycles/:id
 * @access Private (field_agent owner, admin)
 */
async function updateCycle(req, res, next) {
  try {
    const cycle = await cyclesService.updateCycle(
      req.params.id,
      req.user._id,
      req.user.role,
      req.body
    );
    res.status(200).json({
      status: "success",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit cycle for review (draft → under_review)
 * @route POST /api/cycles/:id/submit
 * @access Private (field_agent owner)
 */
async function submitForReview(req, res, next) {
  try {
    const cycle = await cyclesService.submitForReview(req.params.id, req.user._id);
    res.status(200).json({
      status: "success",
      message: "Cycle submitted for review",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve cycle (under_review → approved)
 * @route POST /api/cycles/:id/approve
 * @access Private (admin)
 */
async function approveCycle(req, res, next) {
  try {
    const cycle = await cyclesService.approveCycle(req.params.id, req.user._id);
    res.status(200).json({
      status: "success",
      message: "Cycle approved",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject cycle (under_review → cancelled)
 * @route POST /api/cycles/:id/reject
 * @access Private (admin)
 */
async function rejectCycle(req, res, next) {
  try {
    const { reason } = req.body;
    const cycle = await cyclesService.rejectCycle(req.params.id, req.user._id, reason);
    res.status(200).json({
      status: "success",
      message: "Cycle rejected",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Publish cycle for funding (approved → funding)
 * @route POST /api/cycles/:id/publish
 * @access Private (admin)
 */
async function publishForFunding(req, res, next) {
  try {
    const cycle = await cyclesService.publishForFunding(req.params.id, req.user._id);
    res.status(200).json({
      status: "success",
      message: "Cycle published for funding",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel cycle (any → cancelled)
 * @route POST /api/cycles/:id/cancel
 * @access Private (admin)
 */
async function cancelCycle(req, res, next) {
  try {
    const { reason } = req.body;
    const cycle = await cyclesService.cancelCycle(req.params.id, req.user._id, reason);
    res.status(200).json({
      status: "success",
      message: "Cycle cancelled",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Complete cycle (in_progress → completed)
 * @route POST /api/cycles/:id/complete
 * @access Private (admin)
 */
async function completeCycle(req, res, next) {
  try {
    const { finalSaleAmount } = req.body;
    const cycle = await cyclesService.completeCycle(
      req.params.id,
      req.user._id,
      finalSaleAmount
    );
    res.status(200).json({
      status: "success",
      message: "Cycle completed",
      data: cycle,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCycle,
  listCycles,
  getCycle,
  updateCycle,
  submitForReview,
  approveCycle,
  rejectCycle,
  publishForFunding,
  cancelCycle,
  completeCycle,
};
