const { Schema, model } = require("mongoose");
const { UPDATE_TYPES_LIST } = require("../../constants");

/**
 * ProgressUpdate Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.5
 *
 * Represents a field agent visit log with notes and photos.
 * Creates a timeline of updates for investors to track cycle progress.
 */
const progressUpdateSchema = new Schema(
  {
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "Cycle",
      required: true,
    },
    fieldAgentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updateType: {
      type: String,
      enum: UPDATE_TYPES_LIST,
      required: true,
    },
    notes: {
      type: String,
      default: null,
    },
    photoUrls: [
      {
        type: String,
      },
    ],
    visitDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
progressUpdateSchema.index({ cycleId: 1 });
progressUpdateSchema.index({ cycleId: 1, visitDate: -1 });

module.exports = model("ProgressUpdate", progressUpdateSchema);
