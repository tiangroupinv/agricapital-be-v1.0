const { Schema, model } = require("mongoose");
const {
  PAYMENT_METHODS_LIST,
  DISBURSEMENT_STATUS_LIST,
} = require("../../constants");

/**
 * Disbursement Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.4
 *
 * Represents a tranche of money released to a farmer.
 * Multiple disbursements can be made against a single cycle.
 */
const disbursementSchema = new Schema(
  {
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
    purpose: {
      type: String,
      required: true,
      description: "Purpose of disbursement - e.g. 'Dairy feed purchase - batch 1'",
    },
    method: {
      type: String,
      enum: PAYMENT_METHODS_LIST,
      required: true,
    },
    transactionReference: {
      type: String,
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: DISBURSEMENT_STATUS_LIST,
      default: "pending",
    },
    disbursedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
disbursementSchema.index({ cycleId: 1 });

module.exports = model("Disbursement", disbursementSchema);
