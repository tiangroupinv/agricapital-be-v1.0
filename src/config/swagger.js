const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AgriCapital Rwanda API",
      version: "1.0.0",
      description:
        "Backend API for AgriCapital Rwanda - A crowdfunding platform connecting investors with smallholder farmers in Rwanda",
      contact: {
        name: "AgriCapital Engineering",
        email: "engineering@agricapital.rw",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
      {
        url: "https://api.agricapital.rw",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT authorization using the Bearer scheme",
        },
      },
      schemas: {
        // User schemas
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "6789abcdef0123456789abcde",
            },
            role: {
              type: "string",
              enum: ["investor", "farmer", "field_agent", "admin"],
            },
            fullName: {
              type: "string",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            phone: {
              type: "string",
              example: "+250788000001",
            },
            kycStatus: {
              type: "string",
              enum: ["not_required", "pending", "verified", "rejected"],
            },
            isActive: {
              type: "boolean",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        // Error response
        Error: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["fail", "error"],
            },
            message: {
              type: "string",
            },
          },
        },
        // Pagination
        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              example: 1,
            },
            limit: {
              type: "integer",
              example: 20,
            },
            total: {
              type: "integer",
              example: 100,
            },
            pages: {
              type: "integer",
              example: 5,
            },
          },
        },
        // Cycle schemas
        CycleStatus: {
          type: "string",
          enum: [
            "draft",
            "under_review",
            "approved",
            "funding",
            "funded",
            "in_progress",
            "completed",
            "closed",
            "cancelled",
          ],
        },
        CycleType: {
          type: "string",
          enum: ["crop", "livestock"],
        },
        CyclePurpose: {
          type: "string",
          enum: ["feeds", "vaccines", "seeds", "fertilizer", "other"],
        },
        OffTakerAgreement: {
          type: "object",
          properties: {
            buyerName: {
              type: "string",
              example: "Rwanda Trading Company",
            },
            buyerType: {
              type: "string",
              enum: ["cooperative", "processor", "exporter", "retailer", "other"],
            },
            product: {
              type: "string",
              example: "Maize",
            },
            pricePerUnit: {
              type: "number",
              example: 350,
            },
            quantity: {
              type: "number",
              example: 1000,
            },
            contractReference: {
              type: "string",
              example: "RTC-2024-001",
            },
            contractDocumentUrl: {
              type: "string",
              format: "uri",
            },
          },
        },
        Insurance: {
          type: "object",
          properties: {
            naisCovered: {
              type: "boolean",
              default: false,
            },
            policyReference: {
              type: "string",
            },
            insurerName: {
              type: "string",
            },
            coverageStartDate: {
              type: "string",
              format: "date-time",
            },
            coverageEndDate: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Cycle: {
          type: "object",
          properties: {
            _id: {
              type: "string",
            },
            farmerId: {
              type: "string",
              description: "Reference to farmer (User)",
            },
            fieldAgentIds: {
              type: "array",
              items: {
                type: "string",
              },
            },
            type: {
              $ref: "#/components/schemas/CycleType",
            },
            purpose: {
              $ref: "#/components/schemas/CyclePurpose",
            },
            targetAmount: {
              type: "number",
              example: 500000,
              description: "Target funding amount in RWF",
            },
            fundedAmount: {
              type: "number",
              example: 0,
              description: "Current funded amount in RWF",
            },
            finalSaleAmount: {
              type: "number",
              nullable: true,
              description: "Final sale amount at cycle completion",
            },
            status: {
              $ref: "#/components/schemas/CycleStatus",
            },
            location: {
              type: "string",
              example: "Musanze District",
            },
            expectedStartDate: {
              type: "string",
              format: "date-time",
            },
            expectedEndDate: {
              type: "string",
              format: "date-time",
            },
            offTakerAgreement: {
              $ref: "#/components/schemas/OffTakerAgreement",
            },
            insurance: {
              $ref: "#/components/schemas/Insurance",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        CycleInput: {
          type: "object",
          required: ["farmerId", "type", "purpose", "targetAmount", "location"],
          properties: {
            farmerId: {
              type: "string",
              description: "ID of the farmer for this cycle",
            },
            type: {
              $ref: "#/components/schemas/CycleType",
            },
            purpose: {
              $ref: "#/components/schemas/CyclePurpose",
            },
            targetAmount: {
              type: "number",
              minimum: 10000,
              description: "Target funding amount in RWF (min 10,000)",
            },
            location: {
              type: "string",
              description: "Geographic location (district)",
            },
            expectedStartDate: {
              type: "string",
              format: "date-time",
            },
            expectedEndDate: {
              type: "string",
              format: "date-time",
            },
            offTakerAgreement: {
              $ref: "#/components/schemas/OffTakerAgreement",
            },
            insurance: {
              $ref: "#/components/schemas/Insurance",
            },
          },
        },
        CycleUpdate: {
          type: "object",
          properties: {
            type: {
              $ref: "#/components/schemas/CycleType",
            },
            purpose: {
              $ref: "#/components/schemas/CyclePurpose",
            },
            targetAmount: {
              type: "number",
              minimum: 10000,
            },
            location: {
              type: "string",
            },
            expectedStartDate: {
              type: "string",
              format: "date-time",
            },
            expectedEndDate: {
              type: "string",
              format: "date-time",
            },
            offTakerAgreement: {
              $ref: "#/components/schemas/OffTakerAgreement",
            },
            insurance: {
              $ref: "#/components/schemas/Insurance",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Auth",
        description: "Authentication endpoints",
      },
      {
        name: "Users",
        description: "User management endpoints",
      },
      {
        name: "Cycles",
        description: "Cycle management endpoints",
      },
    ],
  },
  apis: [
    "./src/modules/auth/auth.routes.js",
    "./src/modules/users/users.routes.js",
    "./src/modules/cycles/cycles.routes.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
