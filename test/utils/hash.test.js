const { hashPassword, comparePassword } = require("../../src/utils/hash");

describe("Hash Utility", () => {
  describe("hashPassword", () => {
    it("should hash a plain text password", async () => {
      const password = "MySecurePassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "SamePassword456";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Different salts should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string password", async () => {
      const hash = await hashPassword("");
      expect(hash).toBeDefined();
    });

    it("should handle long passwords", async () => {
      const longPassword = "a".repeat(100);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
    });
  });

  describe("comparePassword", () => {
    it("should return true for correct password", async () => {
      const password = "CorrectPassword789";
      const hash = await hashPassword(password);

      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const password = "CorrectPassword789";
      const wrongPassword = "WrongPassword789";
      const hash = await hashPassword(password);

      const isMatch = await comparePassword(wrongPassword, hash);
      expect(isMatch).toBe(false);
    });

    it("should return false for empty password", async () => {
      const password = "SomePassword";
      const hash = await hashPassword(password);

      const isMatch = await comparePassword("", hash);
      expect(isMatch).toBe(false);
    });

    it("should be case-sensitive", async () => {
      const password = "CaseSensitivePass";
      const hash = await hashPassword(password);

      const isMatch = await comparePassword("casesensitivepass", hash);
      expect(isMatch).toBe(false);
    });
  });
});
