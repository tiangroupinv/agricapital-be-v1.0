/**
 * MongoDB JSON Schema Validator for Investments Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.3, §7
 */
const {
  PAYMENT_METHODS_LIST,
  INVESTMENT_STATUS_LIST,
} = require("../../constants");

const investmentsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["investorId", "cycleId", "amount", "paymentMethod"],
    properties: {
      investorId: {
        bsonType: "objectId",
        description: "Reference to the investor (User)",
      },
      cycleId: {
        bsonType: "objectId",
        description: "Reference to the cycle",
      },
      amount: {
        bsonType: "number",
        minimum: 0,
        description: "Investment amount in RWF",
      },
      paymentMethod: {
        enum: PAYMENT_METHODS_LIST,
        description: "Payment method - momo, airtel_money, bank_transfer",
      },
      transactionReference: {
        bsonType: "string",
        description: "External transaction reference",
      },
      status: {
        enum: INVESTMENT_STATUS_LIST,
        description: "Investment status - pending, confirmed, failed, refunded",
      },
      confirmedAt: {
        bsonType: "date",
        description: "Date when investment was confirmed",
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

module.exports = investmentsValidator;
