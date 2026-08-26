/**
 * Cycle status values
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §5
 */
const CYCLE_STATUS = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  FUNDING: 'funding',
  FUNDED: 'funded',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
};

const CYCLE_STATUS_LIST = Object.values(CYCLE_STATUS);

/**
 * Valid status transitions
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §5
 */
const CYCLE_TRANSITIONS = {
  [CYCLE_STATUS.DRAFT]: [CYCLE_STATUS.UNDER_REVIEW],
  [CYCLE_STATUS.UNDER_REVIEW]: [CYCLE_STATUS.APPROVED, CYCLE_STATUS.CANCELLED],
  [CYCLE_STATUS.APPROVED]: [CYCLE_STATUS.FUNDING, CYCLE_STATUS.CANCELLED],
  [CYCLE_STATUS.FUNDING]: [CYCLE_STATUS.FUNDED, CYCLE_STATUS.CANCELLED],
  [CYCLE_STATUS.FUNDED]: [CYCLE_STATUS.IN_PROGRESS],
  [CYCLE_STATUS.IN_PROGRESS]: [CYCLE_STATUS.COMPLETED],
  [CYCLE_STATUS.COMPLETED]: [CYCLE_STATUS.CLOSED],
  [CYCLE_STATUS.CLOSED]: [], // Terminal state
  [CYCLE_STATUS.CANCELLED]: [], // Terminal state
};

module.exports = {
  CYCLE_STATUS,
  CYCLE_STATUS_LIST,
  CYCLE_TRANSITIONS,
};
