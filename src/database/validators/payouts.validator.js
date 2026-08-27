/**
 * MongoDB JSON Schema Validator for Payouts Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.6, §7
 */
const { PAYOUT_STATUS_LIST } = require("../../constants");

const payoutsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["cycleId", "investorId", "investmentId", "grossReturnAmount", "platformFeeAmount", "brokerageFeeAmount", "netPayoutAmount"],
    properties: {
      cycleId: {
        bsonType: "objectId",
        description: "Reference to the cycle",
      },
      investorId: {
        bsonType: "objectId",
        description: "Reference to the investor (User)",
      },
      investmentId: {
        bsonType: "objectId",
        description: "Reference to the original investment",
      },
      grossReturnAmount: {
        bsonType: "number",
        minimum: 0,
        description: "Gross return amount before fees",
      },
      platformFeeAmount: {
        bsonType: "number",
        minimum: 0,
        description: "Platform fee (10-15% of gross)",
      },
      brokerageFeeAmount: {
        bsonType: "number",
        minimum: 0,
        description: "Brokerage fee (3-5% of gross)",
      },
      netPayoutAmount: {
        bsonType: "number",
        minimum: 0,
        description: "Net payout after fees (gross - platform - brokerage)",
      },
      status: {
        enum: PAYOUT_STATUS_LIST,
        description: "Payout status - pending, processed, failed",
      },
      transactionReference: {
        bsonType: "string",
        description: "External transaction reference",
      },
      processedAt: {
        bsonType: "date",
        description: "Date when payout was processed",
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

module.exports = payoutsValidator;
