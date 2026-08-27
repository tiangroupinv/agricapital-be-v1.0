/**
 * MongoDB JSON Schema Validator for Cycles Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2, §7
 */
const {
  CYCLE_STATUS_LIST,
  CYCLE_TYPES_LIST,
  CYCLE_PURPOSES_LIST,
  BUYER_TYPES_LIST,
  INCIDENT_TYPES_LIST,
  CLAIM_STATUS_LIST,
} = require("../../constants");

const cyclesValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["farmerId", "type", "purpose", "targetAmount", "status", "location"],
    properties: {
      farmerId: {
        bsonType: "objectId",
        description: "Reference to the farmer (User)",
      },
      fieldAgentIds: {
        bsonType: "array",
        description: "Array of field agent IDs assigned to this cycle",
        items: { bsonType: "objectId" },
      },
      type: {
        enum: CYCLE_TYPES_LIST,
        description: "Cycle type - crop or livestock",
      },
      purpose: {
        enum: CYCLE_PURPOSES_LIST,
        description: "Purpose of funding - feeds, vaccines, seeds, fertilizer, other",
      },
      targetAmount: {
        bsonType: "number",
        minimum: 0,
        description: "Target funding amount in RWF",
      },
      fundedAmount: {
        bsonType: "number",
        minimum: 0,
        description: "Current funded amount in RWF",
      },
      finalSaleAmount: {
        bsonType: "number",
        minimum: 0,
        description: "Final sale amount at cycle completion",
      },
      status: {
        enum: CYCLE_STATUS_LIST,
        description: "Cycle status - see workflow in design doc §5",
      },
      location: {
        bsonType: "string",
        description: "Geographic location (district)",
      },
      expectedStartDate: {
        bsonType: "date",
      },
      expectedEndDate: {
        bsonType: "date",
      },
      // Embedded off-taker agreement
      offTakerAgreement: {
        bsonType: "object",
        description: "Buyer contract - embedded in cycle",
        properties: {
          buyerName: { bsonType: "string" },
          buyerType: { enum: BUYER_TYPES_LIST },
          product: { bsonType: "string" },
          pricePerUnit: { bsonType: "number", minimum: 0 },
          quantity: { bsonType: "number", minimum: 0 },
          contractReference: { bsonType: "string" },
          contractDocumentUrl: { bsonType: "string" },
        },
      },
      // Embedded insurance
      insurance: {
        bsonType: "object",
        description: "NAIS insurance record - embedded in cycle",
        properties: {
          naisCovered: { bsonType: "bool" },
          policyReference: { bsonType: "string" },
          insurerName: { bsonType: "string" },
          coverageStartDate: { bsonType: "date" },
          coverageEndDate: { bsonType: "date" },
          claims: {
            bsonType: "array",
            description: "Insurance claims - grows slowly",
            items: {
              bsonType: "object",
              required: ["incidentType"],
              properties: {
                incidentType: { enum: INCIDENT_TYPES_LIST },
                description: { bsonType: "string" },
                reportedBy: { bsonType: "objectId" },
                claimStatus: { enum: CLAIM_STATUS_LIST },
                reportedAt: { bsonType: "date" },
                resolvedAt: { bsonType: "date" },
              },
            },
          },
        },
      },
      approvedAt: { bsonType: "date" },
      completedAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

module.exports = cyclesValidator;
