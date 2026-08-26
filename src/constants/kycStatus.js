/**
 * KYC status values for users
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.1
 */
const KYC_STATUS = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

const KYC_STATUS_LIST = Object.values(KYC_STATUS);

module.exports = {
  KYC_STATUS,
  KYC_STATUS_LIST,
};
