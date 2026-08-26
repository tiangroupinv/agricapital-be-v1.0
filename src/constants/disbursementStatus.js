/**
 * Disbursement status values
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.4
 */
const DISBURSEMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const DISBURSEMENT_STATUS_LIST = Object.values(DISBURSEMENT_STATUS);

module.exports = {
  DISBURSEMENT_STATUS,
  DISBURSEMENT_STATUS_LIST,
};
