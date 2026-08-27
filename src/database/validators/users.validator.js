/**
 * MongoDB JSON Schema Validator for Users Collection
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.1, §7
 */
const {
  ROLES_LIST,
  KYC_STATUS_LIST,
  FARM_TYPES_LIST,
} = require("../../constants");

const usersValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["role", "fullName", "email", "phone", "passwordHash", "idDocumentNumber"],
    properties: {
      role: {
        enum: ROLES_LIST,
        description: "User role - must be one of: investor, farmer, field_agent, admin",
      },
      fullName: {
        bsonType: "string",
        description: "Full name - required string",
      },
      email: {
        bsonType: "string",
        description: "Email address - required, must be unique",
      },
      phone: {
        bsonType: "string",
        description: "Phone number - required, must be unique",
      },
      passwordHash: {
        bsonType: "string",
        description: "Hashed password - required",
      },
      kycStatus: {
        enum: KYC_STATUS_LIST,
        description: "KYC verification status",
      },
      idDocumentNumber: {
        bsonType: "string",
        description: "ID document number - string to preserve leading zeros",
      },
      paymentDetails: {
        bsonType: "object",
        description: "Payment details - optional",
        properties: {
          momoNumber: { bsonType: "string" },
          bankAccount: { bsonType: "string" },
        },
      },
      farmerProfile: {
        bsonType: "object",
        description: "Farmer profile - only present when role = 'farmer'",
        properties: {
          location: { bsonType: "string" },
          farmType: { enum: FARM_TYPES_LIST },
          cooperativeName: { bsonType: "string" },
        },
      },
      isActive: {
        bsonType: "bool",
        description: "Whether the user account is active",
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

module.exports = usersValidator;
