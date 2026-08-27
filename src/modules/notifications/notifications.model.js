const { Schema, model } = require("mongoose");
const {
  NOTIFICATION_TYPES_LIST,
  NOTIFICATION_CHANNELS_LIST,
  NOTIFICATION_STATUS_LIST,
} = require("../../constants");

/**
 * Notification Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.8
 *
 * Represents email or SMS notifications sent to users.
 */
const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES_LIST,
      required: true,
    },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS_LIST,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: NOTIFICATION_STATUS_LIST,
      default: "pending",
    },
  },
  { timestamps: true }
);

// Indexes
notificationSchema.index({ userId: 1 });

module.exports = model("Notification", notificationSchema);
