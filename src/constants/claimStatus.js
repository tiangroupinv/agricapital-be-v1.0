/**
 * Insurance claim status values
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2 (insurance.claims)
 */
const CLAIM_STATUS = {
  REPORTED: 'reported',
  FILED: 'filed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
};

const CLAIM_STATUS_LIST = Object.values(CLAIM_STATUS);

module.exports = {
  CLAIM_STATUS,
  CLAIM_STATUS_LIST,
};
