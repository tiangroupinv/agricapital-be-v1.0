const { Schema, model } = require("mongoose");

/**
 * AuditLog Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.7
 *
 * IMPORTANT: This collection is append-only for compliance.
 * No documents should ever be updated or deleted.
 *
 * Satisfies Rwanda's Data Protection Law (Law n°058/2021) access-logging obligation.
 */
const auditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // Nullable for system actions
    },
    action: {
      type: String,
      required: true,
      description: "Action performed - e.g. 'investment.confirmed', 'disbursement.created'",
    },
    entityType: {
      type: String,
      required: true,
      description: "Type of entity - e.g. 'investment', 'cycle', 'payout'",
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes - for compliance lookups: "show me the history of this record"
auditLogSchema.index({ entityType: 1, entityId: 1 });

// Note: Add a pre('update') and pre('delete') hook to prevent modifications
// This will be enforced at the service layer as well

module.exports = model("AuditLog", auditLogSchema);
