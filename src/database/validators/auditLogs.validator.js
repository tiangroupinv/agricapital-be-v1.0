/**
 * MongoDB JSON Schema Validator for AuditLogs Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.7, §7
 *
 * IMPORTANT: This collection is append-only.
 * No updates or deletes should ever be performed.
 */

const auditLogsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["action", "entityType", "entityId"],
    properties: {
      actorId: {
        bsonType: "objectId",
        description: "Reference to the user who performed the action (nullable for system actions)",
      },
      action: {
        bsonType: "string",
        description: "Action performed - e.g. 'investment.confirmed', 'disbursement.created'",
      },
      entityType: {
        bsonType: "string",
        description: "Type of entity - e.g. 'investment', 'cycle', 'payout'",
      },
      entityId: {
        bsonType: "objectId",
        description: "Reference to the affected entity",
      },
      oldValue: {
        bsonType: "object",
        description: "Previous value (for updates)",
      },
      newValue: {
        bsonType: "object",
        description: "New value (for creates/updates)",
      },
      createdAt: { bsonType: "date" },
    },
  },
};

module.exports = auditLogsValidator;
