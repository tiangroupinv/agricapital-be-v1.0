require("dotenv").config();
const mongoose = require("mongoose");
const validators = require("./validators");

/**
 * Database connection and setup module
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §7, §8
 */

/**
 * Connect to MongoDB
 * - Uses MONGODB_URI from environment
 * - Applies schema validators to collections
 * - Syncs indexes in non-production environments
 */

async function connect() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  try {
    // connect to MongoDB
    await mongoose.connect(mongoUri, {});

    console.log(" MongoDB connected successfully");

    // Apply validators to collection
    await applyValidators();

    // sync indexes in non-production environments
    if (process.env.NODE_ENV !== "production") {
      await syncIndexes();
    }

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
}

/**
 * Apply JSON Schema validators to collections
 * enforces validation at the database level
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §7
 */

async function applyValidators() {
  const db = mongoose.connection.db;

  // Get list of existing collections
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map((c) => c.name);

  // Define all validators with their collections names
  const collectionsToValidate = [
    { name: "users", validator: validators.users },
    { name: "cycles", validator: validators.cycles },
    { name: "investments", validator: validators.investments },
    { name: "disbursements", validator: validators.disbursements },
    { name: "progressupdates", validator: validators.progressUpdates },
    { name: "payouts", validator: validators.payouts },
    { name: "auditlogs", validator: validators.auditLogs },
    { name: "notifications", validator: validators.notifications },
  ];

  for (const { name, validator } of collectionsToValidate) {
    if (existingNames.includes(name)) {
      // Add validator
      await db.command({
        collMod: name,
        validator: validator,
        validationLevel: "moderate",
        validationAction: "error",
      });
      console.log(`Applied validator to existing collection: ${name}`);
    } else {
      // Create collection with validator
      await db.createCollection(name, {
        validator: validator,
        validationLevel: "moderate",
        validationAction: "error",
      });
      console.log(`Created collection with validator: ${name}`);
    }
  }

  console.log("All validators applied successfully");
}

/**
 * Sync Mongoose schema indexes with MongoDB
 * - Ensures all indexes defined in models are created in the database
 * - Removes indexes that no longer exist in the schema
 * - Only runs in non-production to avoid performance impact
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §8
 */

async function syncIndexes() {
  try {
    // Get all registered Mongoose models
    const models = Object.keys(mongoose.models);

    for (const modelName of models) {
      const model = mongoose.models[modelName];
      await model.syncIndexes();
      console.log(`Synced indexes for: ${modelName}`);
    }
    console.log("All indexes synced successfully");
  } catch (error) {
    console.error("Error syncing indexes:", error.message);
  }
}

/**
 * Gracefully close the database connection
 */
async function disconnect() {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error.message);
    throw error;
  }
}

module.exports = { connect, disconnect, applyValidators, syncIndexes };
