/**
 * Payout status values
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.6
 */
const PAYOUT_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
};

const PAYOUT_STATUS_LIST = Object.values(PAYOUT_STATUS);

module.exports = {
  PAYOUT_STATUS,
  PAYOUT_STATUS_LIST,
};
