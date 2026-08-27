const { connectTestDB, disconnectTestDB } = require("./testDatabase");

// Run once before all tests
beforeAll(async () => {
  await connectTestDB();
});

// Run once after all tests
afterAll(async () => {
  await disconnectTestDB();
});
