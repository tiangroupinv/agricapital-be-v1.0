// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-investments-testing";
process.env.JWT_EXPIRES_IN = "1h";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../../src/app"); // Adjust path to your Express app
const { clearDatabase } = require("../../setup/testDatabase");
const { signToken } = require("../../../src/utils/jwt");
const User = require("../../../src/modules/users/users.model");
const Cycle = require("../../../src/modules/cycles/cycles.model");
const Investment = require("../../../src/modules/investments/investments.model");
const { ROLES, KYC_STATUS, CYCLE_STATUS, INVESTMENT_STATUS } = require("../../../src/constants");
const { hashPassword } = require("../../../src/utils/hash");

describe("Investment Routes", () => {
  let investorUser, adminUser, farmerUser;
  let investorToken, adminToken, farmerToken;
  let investableCycle;

  beforeEach(async () => {
    await clearDatabase();

    // Create test users
    const investorHash = await hashPassword("Password123");
    investorUser = await User.create({
      role: ROLES.INVESTOR,
      fullName: "Test Investor",
      email: "investor@example.com",
      phone: "+250788000001",
      passwordHash: investorHash,
      idDocumentNumber: "1198012345678001",
      kycStatus: KYC_STATUS.VERIFIED,
    });
    investorToken = signToken({ userId: investorUser._id, role: investorUser.role });

    const adminHash = await hashPassword("Admin123");
    adminUser = await User.create({
      role: ROLES.ADMIN,
      fullName: "Admin User",
      email: "admin@example.com",
      phone: "+250788000002",
      passwordHash: adminHash,
      idDocumentNumber: "1198012345678002",
    });
    adminToken = signToken({ userId: adminUser._id, role: adminUser.role });

    const farmerHash = await hashPassword("Farmer123");
    farmerUser = await User.create({
      role: ROLES.FARMER,
      fullName: "Farmer User",
      email: "farmer@example.com",
      phone: "+250788000003",
      passwordHash: farmerHash,
      idDocumentNumber: "1198012345678003",
      kycStatus: KYC_STATUS.VERIFIED,
      farmerProfile: {
        farmType: "crop",
        location: "Bugesera",
      },
    });
    farmerToken = signToken({ userId: farmerUser._id, role: farmerUser.role });

    // Create an investable cycle
    investableCycle = await Cycle.create({
      farmerId: farmerUser._id,
      cycleNumber: "CYCLE-001",
      cycleName: "Test Investable Cycle",
      plantingDate: new Date("2026-01-15"),
      expectedHarvestDate: new Date("2026-07-15"),
      targetAmount: 500000,
      fundedAmount: 0,
      status: CYCLE_STATUS.FUNDING,
      fieldAgentIds: [new mongoose.Types.ObjectId()],
      type: "crop",
      purpose: "seeds",
      location: "Bugesera",
      farmerProfile: {
        firstName: "John",
        lastName: "Doe",
        phone: "+250788000003",
        village: "Kigali",
      },
      offTakerAgreement: {
        offTakerId: new mongoose.Types.ObjectId(),
        pricePerUnit: 5000,
        quantity: 100,
      },
      insurance: {
        coverageType: "all_risk",
        premiumAmount: 50000,
        provider: "AIG",
      },
    });
  });

  describe("POST /api/investments - Initiate Investment", () => {
    it("should allow a verified investor to initiate an investment", async () => {
      const investmentData = {
        cycleId: investableCycle._id.toString(),
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}`,
      };

      const res = await request(app)
        .post("/api/investments")
        .set("Authorization", `Bearer ${investorToken}`)
        .send(investmentData)
        .expect(201);

      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data).toHaveProperty("status", INVESTMENT_STATUS.PENDING);
      expect(res.body.data).toHaveProperty("amount", investmentData.amount);
      expect(res.body.data).toHaveProperty("investorId", investorUser._id.toString());

      const investmentInDb = await Investment.findById(res.body.data._id);
      expect(investmentInDb).not.toBeNull();
      expect(investmentInDb.status).toBe(INVESTMENT_STATUS.PENDING);
    });

    it("should return 400 if validation fails", async () => {
      const invalidInvestmentData = {
        cycleId: investableCycle._id.toString(),
        amount: 0, // Invalid amount
        paymentMethod: "invalid", // Invalid payment method
        transactionReference: `REF-${Date.now()}`,
      };

      const res = await request(app)
        .post("/api/investments")
        .set("Authorization", `Bearer ${investorToken}`)
        .send(invalidInvestmentData)
        .expect(400);

      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toMatch(/amount must be greater than zero/);
      expect(res.body.message).toMatch(/paymentMethod must be one of: momo, airtel_money, bank_transfer/);
    });

    it("should return 403 if non-investor tries to initiate investment", async () => {
      const investmentData = {
        cycleId: investableCycle._id.toString(),
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}`,
      };

      await request(app)
        .post("/api/investments")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(investmentData)
        .expect(403);
    });

    it("should return 401 if unauthenticated", async () => {
      const investmentData = {
        cycleId: investableCycle._id.toString(),
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}`,
      };

      await request(app)
        .post("/api/investments")
        .send(investmentData)
        .expect(401);
    });
  });

  describe("POST /api/investments/:id/confirm - Confirm Investment", () => {
    let pendingInvestment;

    beforeEach(async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}`,
      };

      // Initiate a pending investment
      const initialInvestment = new Investment({
        investorId: investorUser._id,
        cycleId: investableCycle._id,
        amount: investmentData.amount,
        paymentMethod: investmentData.paymentMethod,
        transactionReference: investmentData.transactionReference,
        status: INVESTMENT_STATUS.PENDING,
      });
      pendingInvestment = await initialInvestment.save();
    });

    it("should allow admin to confirm a pending investment", async () => {
      const res = await request(app)
        .post(`/api/investments/${pendingInvestment._id}/confirm`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("investment");
      expect(res.body.data.investment).toHaveProperty("status", INVESTMENT_STATUS.CONFIRMED);

      const updatedCycle = await Cycle.findById(investableCycle._id);
      expect(updatedCycle.fundedAmount).toBe(pendingInvestment.amount);
      expect(updatedCycle.status).toBe(CYCLE_STATUS.FUNDING); // Still funding because 100k < 500k target
    });

    it("should return 403 if non-admin or non-owner tries to confirm investment", async () => {
      await request(app)
        .post(`/api/investments/${pendingInvestment._id}/confirm`)
        .set("Authorization", `Bearer ${farmerToken}`)
        .expect(403);
    });

    it("should allow investor to confirm their own investment", async () => {
      const res = await request(app)
        .post(`/api/investments/${pendingInvestment._id}/confirm`)
        .set("Authorization", `Bearer ${investorToken}`)
        .expect(200);
      
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("investment");
      expect(res.body.data.investment).toHaveProperty("status", INVESTMENT_STATUS.CONFIRMED);
    });

    it("should return 422 if investment is not pending", async () => {
      // Manually set investment to confirmed
      await Investment.findByIdAndUpdate(pendingInvestment._id, { status: INVESTMENT_STATUS.CONFIRMED });

      const res = await request(app)
        .post(`/api/investments/${pendingInvestment._id}/confirm`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(422);
      
      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toMatch(/Investment status must be 'pending'/);
    });

    it("should return 404 if investment not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      await request(app)
        .post(`/api/investments/${nonExistentId}/confirm`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});