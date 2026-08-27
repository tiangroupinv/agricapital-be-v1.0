/**
 * MongoDB JSON Schema Validator for Disbursements Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.4, §7
 */
const {
  PAYMENT_METHODS_LIST,
  DISBURSEMENT_STATUS_LIST,
} = require("../../constants");

const disbursementsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["cycleId", "amount", "purpose", "method"],
    properties: {
      cycleId: {
        bsonType: "objectId",
        description: "Reference to the cycle",
      },
      amount: {
        bsonType: "number",
        minimum: 0,
        description: "Disbursement amount in RWF",
      },
      purpose: {
        bsonType: "string",
        description: "Purpose of disbursement - e.g. 'Dairy feed purchase - batch 1'",
      },
      method: {
        enum: PAYMENT_METHODS_LIST,
        description: "Disbursement method - momo, airtel_money, bank_transfer",
      },
      transactionReference: {
        bsonType: "string",
        description: "External transaction reference",
      },
      approvedBy: {
        bsonType: "objectId",
        description: "Reference to admin who approved",
      },
      status: {
        enum: DISBURSEMENT_STATUS_LIST,
        description: "Disbursement status - pending, completed, failed",
      },
      disbursedAt: {
        bsonType: "date",
        description: "Date when disbursement was made",
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

module.exports = disbursementsValidator;
