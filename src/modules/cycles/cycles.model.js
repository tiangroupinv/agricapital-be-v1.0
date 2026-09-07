const { model, Schema } = require("mongoose");
const {
  CYCLE_STATUS_LIST,
  CYCLE_TYPES_LIST,
  CYCLE_PURPOSES_LIST,
  BUYER_TYPES_LIST,
  INCIDENT_TYPES_LIST,
  CLAIM_STATUS_LIST,
} = require("../../constants");

/**
 * Insurance Claim Schema (embedded in cycles)
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2 (insurance.claims)
 */
const claimSchema = new Schema(
  {
    incidentType: {
      type: String,
      enum: INCIDENT_TYPES_LIST,
      required: true,
    },
    description: { type: String },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    claimStatus: {
      type: String,
      enum: CLAIM_STATUS_LIST,
      default: "reported",
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: { type: Date },
  },
  { _id: false }
);

/**
 * Off-Taker Agreement Schema (embedded in cycles)
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2 (offTakerAgreement)
 */
const offTakerAgreementSchema = new Schema(
  {
    buyerName: { type: String },
    buyerType: {
      type: String,
      enum: BUYER_TYPES_LIST,
    },
    product: { type: String },
    pricePerUnit: { type: Number, min: 0 },
    quantity: { type: Number, min: 0 },
    contractReference: { type: String },
    contractDocumentUrl: { type: String },
  },
  { _id: false }
);

/**
 * Insurance Schema (embedded in cycles)
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2 (insurance)
 */
const insuranceSchema = new Schema(
  {
    naisCovered: {
      type: Boolean,
      default: false,
    },
    policyReference: { type: String },
    insurerName: { type: String },
    coverageStartDate: { type: Date },
    coverageEndDate: { type: Date },
    claims: [claimSchema],
  },
  { _id: false }
);

/**
 * Cycle Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2
 */
const cycleSchema = new Schema(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fieldAgentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    type: {
      type: String,
      enum: CYCLE_TYPES_LIST,
      required: true,
    },
    purpose: {
      type: String,
      enum: CYCLE_PURPOSES_LIST,
      required: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    fundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalSaleAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: CYCLE_STATUS_LIST,
      default: "draft",
    },
    location: {
      type: String,
      required: true,
    },
    expectedStartDate: { type: Date },
    expectedEndDate: { type: Date },
    // Embedded: one buyer contract per cycle
    offTakerAgreement: offTakerAgreementSchema,
    // Embedded: insurance status + any incidents for this cycle
    insurance: insuranceSchema,
    approvedAt: { type: Date },
    completedAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

// Indexes
cycleSchema.index({ status: 1 });
cycleSchema.index({ farmerId: 1 });

module.exports = model("Cycle", cycleSchema);
