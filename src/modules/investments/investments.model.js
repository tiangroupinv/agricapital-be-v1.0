const { Schema, model } = require("mongoose");
const {
  PAYMENT_METHODS_LIST,
  INVESTMENT_STATUS_LIST,
} = require("../../constants");

/**
 * Investment Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.3
 */
const investmentSchema = new Schema(
  {
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "Cycle",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS_LIST,
      required: true,
    },
    transactionReference: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: INVESTMENT_STATUS_LIST,
      default: "pending",
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
investmentSchema.index({ cycleId: 1 });
investmentSchema.index({ investorId: 1 });

module.exports = model("Investment", investmentSchema);
