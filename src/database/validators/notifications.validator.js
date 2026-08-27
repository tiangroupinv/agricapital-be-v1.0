/**
 * MongoDB JSON Schema Validator for Notifications Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.8, §7
 */
const {
  NOTIFICATION_TYPES_LIST,
  NOTIFICATION_CHANNELS_LIST,
  NOTIFICATION_STATUS_LIST,
} = require("../../constants");

const notificationsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "type", "channel", "content"],
    properties: {
      userId: {
        bsonType: "objectId",
        description: "Reference to the user receiving the notification",
      },
      type: {
        enum: NOTIFICATION_TYPES_LIST,
        description: "Notification type - investment_confirmed, disbursement_made, progress_update, cycle_completed",
      },
      channel: {
        enum: NOTIFICATION_CHANNELS_LIST,
        description: "Channel - email or sms",
      },
      content: {
        bsonType: "string",
        description: "Notification message content",
      },
      status: {
        enum: NOTIFICATION_STATUS_LIST,
        description: "Delivery status - pending, sent, failed",
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

module.exports = notificationsValidator;
