/**
 * Investment status values
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.3
 */
const INVESTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const INVESTMENT_STATUS_LIST = Object.values(INVESTMENT_STATUS);

module.exports = {
  INVESTMENT_STATUS,
  INVESTMENT_STATUS_LIST,
};
