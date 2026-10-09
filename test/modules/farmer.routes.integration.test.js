// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-farmer-testing";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/modules/users/users.model");
const { hashPassword } = require("../../src/utils/hash");
const { signToken } = require("../../src/utils/jwt");
const { clearDatabase } = require("../setup/testDatabase");
const { ROLES } = require("../../src/constants");

describe("Farmer Management Routes - RBAC Integration", () => {
  let fieldAgent;
  let fieldAgentToken;
  let admin;
  let adminToken;
  let investor;
  let investorToken;
  let farmer;
  let farmerToken;

  beforeEach(async () => {
    await clearDatabase();

    // Create field agent
    const fieldAgentPasswordHash = await hashPassword("password123");
    fieldAgent = await User.create({
      role: ROLES.FIELD_AGENT,
      fullName: "Test Field Agent",
      email: "fieldagent@test.com",
      phone: "+250788123456",
      passwordHash: fieldAgentPasswordHash,
      idDocumentNumber: "ID123456789",
      kycStatus: "verified",
      isActive: true,
    });
    fieldAgentToken = signToken({ userId: fieldAgent._id, role: fieldAgent.role });

    // Create admin
    const adminPasswordHash = await hashPassword("password123");
    admin = await User.create({
      role: ROLES.ADMIN,
      fullName: "Test Admin",
      email: "admin@test.com",
      phone: "+250788654321",
      passwordHash: adminPasswordHash,
      idDocumentNumber: "ID987654321",
      kycStatus: "verified",
      isActive: true,
    });
    adminToken = signToken({ userId: admin._id, role: admin.role });

    // Create investor
    const investorPasswordHash = await hashPassword("password123");
    investor = await User.create({
      role: ROLES.INVESTOR,
      fullName: "Test Investor",
      email: "investor@test.com",
      phone: "+250788999999",
      passwordHash: investorPasswordHash,
      idDocumentNumber: "ID111111111",
      kycStatus: "verified",
      isActive: true,
    });
    investorToken = signToken({ userId: investor._id, role: investor.role });

    // Create farmer
    const farmerPasswordHash = await hashPassword("password123");
    farmer = await User.create({
      role: ROLES.FARMER,
      fullName: "Test Farmer",
      email: "farmer@test.com",
      phone: "+250788888888",
      passwordHash: farmerPasswordHash,
      idDocumentNumber: "ID111222333",
      farmerProfile: {
        location: "Kigali, Rwanda",
        farmType: "crop",
        cooperativeName: "Test Cooperative",
      },
      kycStatus: "not_required",
      isActive: true,
    });
    farmerToken = signToken({ userId: farmer._id, role: farmer.role });
  });

  const validFarmerData = {
    fullName: "New Farmer",
    email: "newfarmer@test.com",
    phone: "+250788111111",
    password: "password123",
    idDocumentNumber: "ID999999999",
    farmerProfile: {
      location: "Musanze, Rwanda",
      farmType: "crop",
      cooperativeName: "New Cooperative",
    },
  };

  describe("POST /api/farmers", () => {
    it("should return 401 for unauthenticated request", async () => {
      await request(app).post("/api/farmers").send(validFarmerData).expect(401);
    });

    it("should return 403 for investor role", async () => {
      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${investorToken}`)
        .send(validFarmerData)
        .expect(403);
    });

    it("should return 403 for farmer role", async () => {
      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(validFarmerData)
        .expect(403);
    });

    it("should allow field_agent to create farmer", async () => {
      const response = await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(validFarmerData)
        .expect(201);

      expect(response.body.data.role).toBe("farmer");
      expect(response.body.data.kycStatus).toBe("not_required");
      expect(response.body.data.fullName).toBe("New Farmer");
    });

    it("should allow admin to create farmer", async () => {
      const response = await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...validFarmerData,
          email: "admincreated@test.com",
          phone: "+250788222222",
        })
        .expect(201);

      expect(response.body.data.role).toBe("farmer");
    });

    it("should return 400 for invalid farmer data", async () => {
      const invalidData = {
        ...validFarmerData,
        email: "invalid-email",
        phone: "123456",
        password: "short",
      };

      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(invalidData)
        .expect(400);
    });

    it("should return 409 for duplicate email", async () => {
      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(validFarmerData)
        .expect(201);

      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ ...validFarmerData, phone: "+250788999999" })
        .expect(409);
    });

    it("should return 409 for duplicate phone", async () => {
      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(validFarmerData)
        .expect(201);

      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ ...validFarmerData, email: "another@test.com" })
        .expect(409);
    });
  });

  describe("GET /api/farmers", () => {
    beforeEach(async () => {
      // Create a few farmers for listing
      const passwordHash = await hashPassword("password123");
      await User.create({
        role: ROLES.FARMER,
        fullName: "Farmer One",
        email: "farmer1@test.com",
        phone: "+250788111111",
        passwordHash,
        idDocumentNumber: "ID111111111",
        farmerProfile: { location: "Kigali", farmType: "crop" },
        kycStatus: "not_required",
        isActive: true,
      });
      await User.create({
        role: ROLES.FARMER,
        fullName: "Farmer Two",
        email: "farmer2@test.com",
        phone: "+250788222222",
        passwordHash,
        idDocumentNumber: "ID222222222",
        farmerProfile: { location: "Musanze", farmType: "livestock" },
        kycStatus: "not_required",
        isActive: true,
      });
      await User.create({
        role: ROLES.FARMER,
        fullName: "Farmer Three",
        email: "farmer3@test.com",
        phone: "+250788333333",
        passwordHash,
        idDocumentNumber: "ID333333333",
        farmerProfile: { location: "Rubavu", farmType: "crop" },
        kycStatus: "not_required",
        isActive: true,
      });
    });

    it("should return 401 for unauthenticated request", async () => {
      await request(app).get("/api/farmers").expect(401);
    });

    it("should return 403 for investor role", async () => {
      await request(app)
        .get("/api/farmers")
        .set("Authorization", `Bearer ${investorToken}`)
        .expect(403);
    });

    it("should return 403 for farmer role", async () => {
      await request(app)
        .get("/api/farmers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .expect(403);
    });

    it("should allow field_agent to list farmers", async () => {
      const response = await request(app)
        .get("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.data.farmers).toBeDefined();
      expect(Array.isArray(response.body.data.farmers)).toBe(true);
      expect(response.body.data.farmers.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(3);

      // All returned users should have role 'farmer'
      response.body.data.farmers.forEach((f) => {
        expect(f.role).toBe("farmer");
      });
    });

    it("should allow admin to list farmers", async () => {
      const response = await request(app)
        .get("/api/farmers")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.farmers).toBeDefined();
      expect(response.body.data.farmers.length).toBeGreaterThanOrEqual(3);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/farmers?page=1&limit=2")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.data.farmers.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it("should sort by createdAt descending", async () => {
      const response = await request(app)
        .get("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      const farmers = response.body.data.farmers;
      for (let i = 1; i < farmers.length; i++) {
        expect(new Date(farmers[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(farmers[i].createdAt).getTime()
        );
      }
    });

    it("should return 400 for invalid pagination params", async () => {
      await request(app)
        .get("/api/farmers?page=0")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(400);

      await request(app)
        .get("/api/farmers?limit=101")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(400);

      await request(app)
        .get("/api/farmers?limit=0")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(400);
    });

    it("should return only farmers, not other roles", async () => {
      // Create a non-farmer user
      const passwordHash = await hashPassword("password123");
      await User.create({
        role: ROLES.INVESTOR,
        fullName: "Another Investor",
        email: "investor2@test.com",
        phone: "+250788444444",
        passwordHash,
        idDocumentNumber: "ID444444444",
        kycStatus: "verified",
        isActive: true,
      });

      const response = await request(app)
        .get("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      response.body.data.farmers.forEach((f) => {
        expect(f.role).toBe("farmer");
      });
    });
  });

  describe("GET /api/farmers/:id", () => {
    it("should return 401 for unauthenticated request", async () => {
      await request(app).get(`/api/farmers/${farmer._id}`).expect(401);
    });

    it("should return 403 for investor role", async () => {
      await request(app)
        .get(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${investorToken}`)
        .expect(403);
    });

    it("should return 403 for farmer role", async () => {
      await request(app)
        .get(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${farmerToken}`)
        .expect(403);
    });

    it("should return 400 for invalid ObjectId format", async () => {
      await request(app)
        .get("/api/farmers/invalid-id")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(400);
    });

    it("should return 404 for non-existent farmer", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/farmers/${nonExistentId}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(404);
    });

    it("should return 400 if user is not a farmer", async () => {
      await request(app)
        .get(`/api/farmers/${investor._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(400);
    });

    it("should allow field_agent to get farmer", async () => {
      const response = await request(app)
        .get(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.data._id).toBe(farmer._id.toString());
      expect(response.body.data.role).toBe("farmer");
      expect(response.body.data).not.toHaveProperty("passwordHash");
    });

    it("should allow admin to get farmer", async () => {
      const response = await request(app)
        .get(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data._id).toBe(farmer._id.toString());
      expect(response.body.data).not.toHaveProperty("passwordHash");
    });

    it("should exclude passwordHash from response", async () => {
      const response = await request(app)
        .get(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.data.passwordHash).toBeUndefined();
    });
  });

  describe("PATCH /api/farmers/:id", () => {
    const updateData = {
      fullName: "Updated Farmer Name",
      phone: "+250788777777",
    };

    it("should return 401 for unauthenticated request", async () => {
      await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .send(updateData)
        .expect(401);
    });

    it("should return 403 for investor role", async () => {
      await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${investorToken}`)
        .send(updateData)
        .expect(403);
    });

    it("should return 403 for farmer role", async () => {
      await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(updateData)
        .expect(403);
    });

    it("should return 400 for invalid ObjectId format", async () => {
      await request(app)
        .patch("/api/farmers/invalid-id")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(updateData)
        .expect(400);
    });

    it("should return 404 for non-existent farmer", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      await request(app)
        .patch(`/api/farmers/${nonExistentId}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(updateData)
        .expect(404);
    });

    it("should return 400 if target user is not a farmer", async () => {
      await request(app)
        .patch(`/api/farmers/${investor._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(updateData)
        .expect(400);
    });

    it("should return 409 when updating phone to existing value", async () => {
      // Create another farmer with a phone number
      const passwordHash = await hashPassword("password123");
      await User.create({
        role: ROLES.FARMER,
        fullName: "Other Farmer",
        email: "other@test.com",
        phone: "+250788555555",
        passwordHash,
        idDocumentNumber: "ID555555555",
        farmerProfile: { location: "Kigali", farmType: "crop" },
        kycStatus: "not_required",
        isActive: true,
      });

      await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ phone: "+250788555555" })
        .expect(409);
    });

    it("should return 400 when attempting to update role", async () => {
      await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ role: "investor" })
        .expect(400);
    });

    it("should allow field_agent to update farmer", async () => {
      const response = await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.fullName).toBe("Updated Farmer Name");
      expect(response.body.data.phone).toBe("+250788777777");
      expect(response.body.data).not.toHaveProperty("passwordHash");
    });

    it("should allow admin to update farmer", async () => {
      const response = await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ fullName: "Admin Updated" })
        .expect(200);

      expect(response.body.data.fullName).toBe("Admin Updated");
    });

    it("should allow partial updates", async () => {
      const response = await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ fullName: "Partially Updated" })
        .expect(200);

      expect(response.body.data.fullName).toBe("Partially Updated");
      expect(response.body.data.phone).toBe("+250788888888"); // unchanged
    });

    it("should allow farmerProfile updates", async () => {
      const response = await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({
          farmerProfile: {
            location: "Rubavu, Rwanda",
            farmType: "livestock",
            cooperativeName: "New Cooperative",
          },
        })
        .expect(200);

      expect(response.body.data.farmerProfile.location).toBe("Rubavu, Rwanda");
      expect(response.body.data.farmerProfile.farmType).toBe("livestock");
      expect(response.body.data.farmerProfile.cooperativeName).toBe(
        "New Cooperative"
      );
    });

    it("should allow paymentDetails updates", async () => {
      const response = await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({
          paymentDetails: {
            momoNumber: "+250788123456",
            bankAccount: "1234567890",
          },
        })
        .expect(200);

      expect(response.body.data.paymentDetails.momoNumber).toBe("+250788123456");
      expect(response.body.data.paymentDetails.bankAccount).toBe("1234567890");
    });

    it("should allow idDocumentNumber updates", async () => {
      const response = await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ idDocumentNumber: "NEWID999999" })
        .expect(200);

      expect(response.body.data.idDocumentNumber).toBe("NEWID999999");
    });
  });
});