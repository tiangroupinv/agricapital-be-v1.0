/**
 * MongoDB JSON Schema Validator for ProgressUpdates Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.5, §7
 */
const { UPDATE_TYPES_LIST } = require("../../constants");

const progressUpdatesValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["cycleId", "fieldAgentId", "updateType", "visitDate"],
    properties: {
      cycleId: {
        bsonType: "objectId",
        description: "Reference to the cycle",
      },
      fieldAgentId: {
        bsonType: "objectId",
        description: "Reference to the field agent (User)",
      },
      updateType: {
        enum: UPDATE_TYPES_LIST,
        description: "Type of update - health_check, growth_stage, vaccination, harvest, incident",
      },
      notes: {
        bsonType: "string",
        description: "Field agent notes from the visit",
      },
      photoUrls: {
        bsonType: "array",
        description: "Array of photo URLs",
        items: { bsonType: "string" },
      },
      visitDate: {
        bsonType: "date",
        description: "Date of the farm visit",
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

module.exports = progressUpdatesValidator;
