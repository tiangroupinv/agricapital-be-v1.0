const { signToken, verifyToken } = require("../../src/utils/jwt");

// Mock environment variables
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
process.env.JWT_EXPIRES_IN = "1h";

describe("JWT Utility", () => {
  describe("signToken", () => {
    it("should sign a token with correct payload", () => {
      const payload = { userId: "123456789", role: "investor" };
      const token = signToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should create different tokens for different payloads", () => {
      const token1 = signToken({ userId: "user1", role: "investor" });
      const token2 = signToken({ userId: "user2", role: "admin" });

      expect(token1).not.toBe(token2);
    });

    it("should create same structure for different roles", () => {
      const roles = ["investor", "farmer", "field_agent", "admin"];

      roles.forEach((role) => {
        const token = signToken({ userId: "123", role });
        expect(token).toBeDefined();
        expect(token.split(".")).toHaveLength(3);
      });
    });
  });

  describe("verifyToken", () => {
    it("should verify and decode a valid token", () => {
      const payload = { userId: "abc123", role: "farmer" };
      const token = signToken(payload);

      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it("should return null for invalid token", () => {
      const invalidToken = "invalid.token.here";

      const decoded = verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should return null for malformed token", () => {
      const malformedTokens = [
        "",
        "not-a-jwt",
        "only.one.part",
        "too.many.parts.here.no",
      ];

      malformedTokens.forEach((token) => {
        expect(verifyToken(token)).toBeNull();
      });
    });

    it("should return null for token signed with different secret", () => {
      // Token signed with different secret
      const jwt = require("jsonwebtoken");
      const fakeToken = jwt.sign({ userId: "123" }, "wrong-secret");

      const decoded = verifyToken(fakeToken);

      expect(decoded).toBeNull();
    });

    it("should include exp and iat in decoded token", () => {
      const payload = { userId: "test123", role: "admin" };
      const token = signToken(payload);

      const decoded = verifyToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.exp).toBe("number");
      expect(typeof decoded.iat).toBe("number");
    });
  });

  describe("Token Expiration", () => {
    it("should create token that expires", () => {
      const payload = { userId: "expiring", role: "investor" };
      const token = signToken(payload);

      const decoded = verifyToken(token);

      // exp should be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now);
    });
  });
});
