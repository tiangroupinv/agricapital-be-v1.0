const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 * Uses replica set to support transactions
 */
async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create({
    replSet: { count: 1, name: "rs0" },
  });
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    retryWrites: false,
    writeConcern: { w: "majority" },
    readConcern: { level: "majority" },
    maxPoolSize: 5,
    minPoolSize: 1,
  });
}

/**
 * Disconnect and close the in-memory MongoDB
 */
async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Clear all collections between tests
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
};