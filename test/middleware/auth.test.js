// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-middleware-testing";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const { protect, authorize } = require("../../src/middleware/auth");
const User = require("../../src/modules/users/users.model");
const { hashPassword } = require("../../src/utils/hash");
const { signToken } = require("../../src/utils/jwt");
const { clearDatabase } = require("../setup/testDatabase");
const { ROLES } = require("../../src/constants");

// Create a minimal Express app for testing middleware
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Protected route
  app.get("/protected", protect, (req, res) => {
    res.status(200).json({ status: "success", userId: req.user._id });
  });

  // Admin only route
  app.get("/admin-only", protect, authorize(ROLES.ADMIN), (req, res) => {
    res.status(200).json({ status: "success", message: "Admin access granted" });
  });

  // Investor only route
  app.get("/investor-only", protect, authorize(ROLES.INVESTOR), (req, res) => {
    res.status(200).json({ status: "success", message: "Investor access granted" });
  });

  // Multiple roles route
  app.get(
    "/multi-role",
    protect,
    authorize(ROLES.ADMIN, ROLES.FIELD_AGENT),
    (req, res) => {
      res.status(200).json({ status: "success", message: "Multi-role access granted" });
    }
  );

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      status: err.status || "error",
      message: err.message,
    });
  });

  return app;
}

describe("Auth Middleware", () => {
  let app;
  let adminUser, investorUser, farmerUser, fieldAgentUser;
  let adminToken, investorToken, farmerToken, fieldAgentToken;

  beforeEach(async () => {
    await clearDatabase();
    app = createTestApp();

    // Create users for each role
    const passwordHash = await hashPassword("TestPass123");

    adminUser = await User.create({
      role: ROLES.ADMIN,
      fullName: "Admin User",
      email: "admin@middleware.test",
      phone: "+250788000500",
      passwordHash,
      idDocumentNumber: "1198012345678500",
    });

    investorUser = await User.create({
      role: ROLES.INVESTOR,
      fullName: "Investor User",
      email: "investor@middleware.test",
      phone: "+250788000501",
      passwordHash,
      idDocumentNumber: "1198012345678501",
    });

    farmerUser = await User.create({
      role: ROLES.FARMER,
      fullName: "Farmer User",
      email: "farmer@middleware.test",
      phone: "+250788000502",
      passwordHash,
      idDocumentNumber: "1198012345678502",
      farmerProfile: { location: "Test Location", farmType: "livestock" },
    });

    fieldAgentUser = await User.create({
      role: ROLES.FIELD_AGENT,
      fullName: "Field Agent User",
      email: "agent@middleware.test",
      phone: "+250788000503",
      passwordHash,
      idDocumentNumber: "1198012345678503",
    });

    // Generate tokens
    adminToken = signToken({ userId: adminUser._id, role: adminUser.role });
    investorToken = signToken({ userId: investorUser._id, role: investorUser.role });
    farmerToken = signToken({ userId: farmerUser._id, role: farmerUser.role });
    fieldAgentToken = signToken({ userId: fieldAgentUser._id, role: fieldAgentUser.role });
  });

  describe("protect middleware", () => {
    it("should allow access with valid token", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.userId).toBe(adminUser._id.toString());
    });

    it("should reject request without token", async () => {
      const response = await request(app)
        .get("/protected")
        .expect(401);

      expect(response.body.message).toBe("You are not logged in. Please log in to access this resource.");
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.message).toBe("Invalid token. Please log in again.");
    });

    it("should reject request with malformed Authorization header", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "InvalidFormat")
        .expect(401);

      expect(response.body.message).toBe("You are not logged in. Please log in to access this resource.");
    });

    it("should reject request if user does not exist", async () => {
      const fakeToken = signToken({ userId: new mongoose.Types.ObjectId(), role: "investor" });

      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body.message).toBe("The user belonging to this token no longer exists.");
    });

    it("should reject request if user is deactivated", async () => {
      await User.findByIdAndUpdate(adminUser._id, { isActive: false });

      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(401);

      expect(response.body.message).toBe("Your account has been deactivated.");
    });

    it("should attach user to request object", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${investorToken}`)
        .expect(200);

      expect(response.body.userId).toBe(investorUser._id.toString());
    });
  });

  describe("authorize middleware", () => {
    it("should allow admin to access admin-only route", async () => {
      const response = await request(app)
        .get("/admin-only")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe("Admin access granted");
    });

    it("should reject investor from admin-only route", async () => {
      const response = await request(app)
        .get("/admin-only")
        .set("Authorization", `Bearer ${investorToken}`)
        .expect(403);

      expect(response.body.message).toBe("You do not have permission to perform this action.");
    });

    it("should reject farmer from admin-only route", async () => {
      const response = await request(app)
        .get("/admin-only")
        .set("Authorization", `Bearer ${farmerToken}`)
        .expect(403);

      expect(response.body.message).toBe("You do not have permission to perform this action.");
    });

    it("should allow investor to access investor-only route", async () => {
      const response = await request(app)
        .get("/investor-only")
        .set("Authorization", `Bearer ${investorToken}`)
        .expect(200);

      expect(response.body.message).toBe("Investor access granted");
    });

    it("should reject farmer from investor-only route", async () => {
      const response = await request(app)
        .get("/investor-only")
        .set("Authorization", `Bearer ${farmerToken}`)
        .expect(403);

      expect(response.body.message).toBe("You do not have permission to perform this action.");
    });

    it("should allow admin to access multi-role route", async () => {
      const response = await request(app)
        .get("/multi-role")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe("Multi-role access granted");
    });

    it("should allow field_agent to access multi-role route", async () => {
      const response = await request(app)
        .get("/multi-role")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.message).toBe("Multi-role access granted");
    });

    it("should reject investor from multi-role route (admin, field_agent)", async () => {
      const response = await request(app)
        .get("/multi-role")
        .set("Authorization", `Bearer ${investorToken}`)
        .expect(403);

      expect(response.body.message).toBe("You do not have permission to perform this action.");
    });

    it("should reject farmer from multi-role route (admin, field_agent)", async () => {
      const response = await request(app)
        .get("/multi-role")
        .set("Authorization", `Bearer ${farmerToken}`)
        .expect(403);

      expect(response.body.message).toBe("You do not have permission to perform this action.");
    });
  });

  describe("Combined protect + authorize", () => {
    it("should reject unauthenticated request before checking authorization", async () => {
      const response = await request(app)
        .get("/admin-only")
        .expect(401);

      // Should fail at protect, not authorize
      expect(response.body.message).toBe("You are not logged in. Please log in to access this resource.");
    });
  });
});
