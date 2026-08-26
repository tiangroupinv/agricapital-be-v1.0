/**
 * Off-taker buyer types
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2 (offTakerAgreement)
 */
const BUYER_TYPES = {
  HOTEL: 'hotel',
  SCHOOL: 'school',
  FACTORY: 'factory',
  EXPORTER: 'exporter',
  SUPERMARKET: 'supermarket',
  OTHER: 'other',
};

const BUYER_TYPES_LIST = Object.values(BUYER_TYPES);

module.exports = {
  BUYER_TYPES,
  BUYER_TYPES_LIST,
};
