module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.js"],
  setupFilesAfterEnv: ["./test/setup/globalSetup.js"],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};
