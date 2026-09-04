// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-cycles-testing";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../src/app");
const Cycle = require("../../src/modules/cycles/cycles.model");
const User = require("../../src/modules/users/users.model");
const { hashPassword } = require("../../src/utils/hash");
const { signToken } = require("../../src/utils/jwt");
const { clearDatabase } = require("../setup/testDatabase");
const { ROLES, CYCLE_STATUS } = require("../../src/constants");

describe("Cycle Module", () => {
  let fieldAgent;
  let fieldAgentToken;
  let admin;
  let adminToken;
  let farmer;

  beforeEach(async () => {
    await clearDatabase();

    // Create field agent
    const fieldAgentHash = await hashPassword("Password123");
    fieldAgent = await User.create({
      role: ROLES.FIELD_AGENT,
      fullName: "Field Agent",
      email: "fieldagent@example.com",
      phone: "+250788000001",
      passwordHash: fieldAgentHash,
      idDocumentNumber: "1198012345678001",
    });
    fieldAgentToken = signToken({ userId: fieldAgent._id, role: fieldAgent.role });

    // Create admin
    const adminHash = await hashPassword("Password123");
    admin = await User.create({
      role: ROLES.ADMIN,
      fullName: "Admin User",
      email: "admin@example.com",
      phone: "+250788000002",
      passwordHash: adminHash,
      idDocumentNumber: "1198012345678002",
    });
    adminToken = signToken({ userId: admin._id, role: admin.role });

    // Create farmer
    const farmerHash = await hashPassword("Password123");
    farmer = await User.create({
      role: ROLES.FARMER,
      fullName: "Farmer Joe",
      email: "farmer@example.com",
      phone: "+250788000003",
      passwordHash: farmerHash,
      idDocumentNumber: "1198012345678003",
      farmerProfile: {
        location: "Musanze District",
        farmType: "crop",
      },
    });
  });

  describe("POST /api/cycles", () => {
    const validCycleData = {
      type: "crop",
      purpose: "seeds",
      targetAmount: 500000,
      location: "Musanze District",
      expectedStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      expectedEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
    };

    it("should create a cycle as field agent", async () => {
      const response = await request(app)
        .post("/api/cycles")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ ...validCycleData, farmerId: farmer._id })
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.status).toBe(CYCLE_STATUS.DRAFT);
      expect(response.body.data.farmerId._id || response.body.data.farmerId).toBe(String(farmer._id));
    });

    it("should create a cycle as admin", async () => {
      const response = await request(app)
        .post("/api/cycles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validCycleData, farmerId: farmer._id })
        .expect(201);

      expect(response.body.status).toBe("success");
    });

    it("should reject creation by non-field-agent/non-admin", async () => {
      const farmerToken = signToken({ userId: farmer._id, role: farmer.role });

      await request(app)
        .post("/api/cycles")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send({ ...validCycleData, farmerId: farmer._id })
        .expect(403);
    });

    it("should require farmerId", async () => {
      const response = await request(app)
        .post("/api/cycles")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(validCycleData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it("should validate farmer is actually a farmer role", async () => {
      const response = await request(app)
        .post("/api/cycles")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ ...validCycleData, farmerId: fieldAgent._id })
        .expect(400);

      expect(response.body.message).toContain("farmer");
    });

    it("should validate minimum target amount", async () => {
      const response = await request(app)
        .post("/api/cycles")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ ...validCycleData, farmerId: farmer._id, targetAmount: 5000 })
        .expect(400);

      expect(response.body.message).toContain("10,000");
    });

    it("should validate end date is after start date", async () => {
      const response = await request(app)
        .post("/api/cycles")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({
          ...validCycleData,
          farmerId: farmer._id,
          expectedStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          expectedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .expect(400);

      expect(response.body.message).toContain("end date");
    });
  });

  describe("GET /api/cycles", () => {
    beforeEach(async () => {
      // Create some test cycles
      await Cycle.create([
        {
          farmerId: farmer._id,
          fieldAgentIds: [fieldAgent._id],
          type: "crop",
          purpose: "seeds",
          targetAmount: 500000,
          location: "Musanze",
          status: CYCLE_STATUS.DRAFT,
        },
        {
          farmerId: farmer._id,
          fieldAgentIds: [fieldAgent._id],
          type: "livestock",
          purpose: "feeds",
          targetAmount: 800000,
          location: "Kigali",
          status: CYCLE_STATUS.UNDER_REVIEW,
        },
      ]);
    });

    it("should list all cycles", async () => {
      const response = await request(app)
        .get("/api/cycles")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.cycles).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const response = await request(app)
        .get("/api/cycles?status=draft")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.data.cycles).toHaveLength(1);
      expect(response.body.data.cycles[0].status).toBe(CYCLE_STATUS.DRAFT);
    });

    it("should paginate results", async () => {
      const response = await request(app)
        .get("/api/cycles?page=1&limit=1")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.data.cycles).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.pages).toBe(2);
    });
  });

  describe("PATCH /api/cycles/:id", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.DRAFT,
      });
    });

    it("should update draft cycle by owner", async () => {
      const response = await request(app)
        .patch(`/api/cycles/${cycle._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ targetAmount: 600000 })
        .expect(200);

      expect(response.body.data.targetAmount).toBe(600000);
    });

    it("should reject update by non-owner field agent", async () => {
      const otherAgent = await User.create({
        role: ROLES.FIELD_AGENT,
        fullName: "Other Agent",
        email: "other@example.com",
        phone: "+250788000004",
        passwordHash: await hashPassword("Password123"),
        idDocumentNumber: "1198012345678004",
      });
      const otherToken = signToken({ userId: otherAgent._id, role: otherAgent.role });

      await request(app)
        .patch(`/api/cycles/${cycle._id}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ targetAmount: 600000 })
        .expect(403);
    });

    it("should allow admin to update any cycle", async () => {
      const response = await request(app)
        .patch(`/api/cycles/${cycle._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ targetAmount: 700000 })
        .expect(200);

      expect(response.body.data.targetAmount).toBe(700000);
    });

    it("should reject update of non-draft cycle", async () => {
      await Cycle.findByIdAndUpdate(cycle._id, { status: CYCLE_STATUS.UNDER_REVIEW });

      await request(app)
        .patch(`/api/cycles/${cycle._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({ targetAmount: 600000 })
        .expect(400);
    });
  });

  describe("POST /api/cycles/:id/submit", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.DRAFT,
      });
    });

    it("should submit cycle for review", async () => {
      const response = await request(app)
        .post(`/api/cycles/${cycle._id}/submit`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(200);

      expect(response.body.data.status).toBe(CYCLE_STATUS.UNDER_REVIEW);
    });

    it("should reject submission by non-owner", async () => {
      const otherAgent = await User.create({
        role: ROLES.FIELD_AGENT,
        fullName: "Other Agent",
        email: "other@example.com",
        phone: "+250788000005",
        passwordHash: await hashPassword("Password123"),
        idDocumentNumber: "1198012345678005",
      });
      const otherToken = signToken({ userId: otherAgent._id, role: otherAgent.role });

      await request(app)
        .post(`/api/cycles/${cycle._id}/submit`)
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe("POST /api/cycles/:id/approve", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.UNDER_REVIEW,
        offTakerAgreement: {
          buyerName: "Rwanda Trading Co",
          buyerType: "exporter",
          product: "Maize",
          pricePerUnit: 350,
          quantity: 1000,
          contractReference: "RTC-2024-001",
        },
      });
    });

    it("should approve cycle as admin", async () => {
      const response = await request(app)
        .post(`/api/cycles/${cycle._id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.status).toBe(CYCLE_STATUS.APPROVED);
    });

    it("should reject approval by non-admin", async () => {
      await request(app)
        .post(`/api/cycles/${cycle._id}/approve`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .expect(403);
    });

    it("should require off-taker agreement for approval", async () => {
      const cycleWithoutAgreement = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.UNDER_REVIEW,
      });

      await request(app)
        .post(`/api/cycles/${cycleWithoutAgreement._id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe("POST /api/cycles/:id/reject", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.UNDER_REVIEW,
      });
    });

    it("should reject cycle as admin with reason", async () => {
      const response = await request(app)
        .post(`/api/cycles/${cycle._id}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Documentation incomplete" })
        .expect(200);

      expect(response.body.data.status).toBe(CYCLE_STATUS.CANCELLED);
      expect(response.body.data.cancellationReason).toBe("Documentation incomplete");
    });

    it("should require rejection reason", async () => {
      await request(app)
        .post(`/api/cycles/${cycle._id}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("POST /api/cycles/:id/publish", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.APPROVED,
      });
    });

    it("should publish cycle for funding as admin", async () => {
      const response = await request(app)
        .post(`/api/cycles/${cycle._id}/publish`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.status).toBe(CYCLE_STATUS.FUNDING);
    });
  });

  describe("POST /api/cycles/:id/cancel", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.APPROVED,
      });
    });

    it("should cancel cycle as admin with reason", async () => {
      const response = await request(app)
        .post(`/api/cycles/${cycle._id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Farmer withdrew from program" })
        .expect(200);

      expect(response.body.data.status).toBe(CYCLE_STATUS.CANCELLED);
    });

    it("should require cancellation reason", async () => {
      await request(app)
        .post(`/api/cycles/${cycle._id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("POST /api/cycles/:id/complete", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.IN_PROGRESS,
      });
    });

    it("should complete cycle with final sale amount", async () => {
      const response = await request(app)
        .post(`/api/cycles/${cycle._id}/complete`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ finalSaleAmount: 850000 })
        .expect(200);

      expect(response.body.data.status).toBe(CYCLE_STATUS.COMPLETED);
      expect(response.body.data.finalSaleAmount).toBe(850000);
    });

    it("should require final sale amount", async () => {
      await request(app)
        .post(`/api/cycles/${cycle._id}/complete`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("Status Transition Validation", () => {
    let cycle;

    beforeEach(async () => {
      cycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Musanze",
        status: CYCLE_STATUS.DRAFT,
      });
    });

    it("should not allow direct transition from draft to approved", async () => {
      await request(app)
        .post(`/api/cycles/${cycle._id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });

    it("should not allow transition from closed", async () => {
      await Cycle.findByIdAndUpdate(cycle._id, { status: CYCLE_STATUS.CLOSED });

      await request(app)
        .post(`/api/cycles/${cycle._id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Too late" })
        .expect(400);
    });
  });
});
