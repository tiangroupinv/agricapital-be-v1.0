const { Schema, model } = require("mongoose");
const { PAYOUT_STATUS_LIST } = require("../../constants");

/**
 * Payout Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.6
 *
 * Represents investor returns at cycle completion.
 * One document per investor, per cycle.
 *
 * BUSINESS RULE: netPayoutAmount = grossReturnAmount - platformFeeAmount - brokerageFeeAmount
 */
const payoutSchema = new Schema(
  {
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "Cycle",
      required: true,
    },
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    investmentId: {
      type: Schema.Types.ObjectId,
      ref: "Investment",
      required: true,
    },
    grossReturnAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFeeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    brokerageFeeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    netPayoutAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: PAYOUT_STATUS_LIST,
      default: "pending",
    },
    transactionReference: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
payoutSchema.index({ cycleId: 1 });
payoutSchema.index({ investorId: 1 });

module.exports = model("Payout", payoutSchema);
