/**
 * Payment method types
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.3, §3.4
 */
const PAYMENT_METHODS = {
  MOMO: 'momo',
  AIRTEL_MONEY: 'airtel_money',
  BANK_TRANSFER: 'bank_transfer',
};

const PAYMENT_METHODS_LIST = Object.values(PAYMENT_METHODS);

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_METHODS_LIST,
};
