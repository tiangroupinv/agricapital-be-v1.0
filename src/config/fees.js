/**
 * Fee configuration
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.6 (payouts)
 *
 * Fee rates are expressed as min/max bands (decimal fractions of gross returns).
 * Service logic must reference this config, never hardcode percentages.
 */
const PLATFORM_FEE_RATE = {
  MIN: 0.1, // 10% of gross
  MAX: 0.15, // 15% of gross
};

const BROKERAGE_FEE_RATE = {
  MIN: 0.03, // 3% of gross
  MAX: 0.05, // 5% of gross
};

module.exports = {
  PLATFORM_FEE_RATE,
  BROKERAGE_FEE_RATE,
};