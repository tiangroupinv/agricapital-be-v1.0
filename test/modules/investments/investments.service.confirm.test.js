// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-investments-testing";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const Investment = require("../../../src/modules/investments/investments.model");
const Cycle = require("../../../src/modules/cycles/cycles.model");
const User = require("../../../src/modules/users/users.model");
const AuditLog = require("../../../src/modules/auditLogs/auditLogs.model");
const {
  initiateInvestment,
  confirmInvestment,
  updateCycleFundedAmount,
  markCycleFunded,
  writeAuditLog,
  checkFundingCap,
  buildKycErrorMessage,
  buildFundingCapErrorMessage,
} = require("../../../src/modules/investments/investments.service");
const { clearDatabase } = require("../../setup/testDatabase");
const { ROLES, KYC_STATUS, CYCLE_STATUS, INVESTMENT_STATUS } = require("../../../src/constants");
const { hashPassword } = require("../../../src/utils/hash");
const ApiError = require("../../../src/utils/apiError");

describe("confirmInvestment - Business Logic Tests", () => {
  let investor, cycle, admin;

  beforeEach(async () => {
    await clearDatabase();

    // Create test users
    const investorHash = await hashPassword("Password123");
    investor = await User.create({
      role: ROLES.INVESTOR,
      fullName: "Test Investor",
      email: "investor@example.com",
      phone: "+250788000001",
      passwordHash: investorHash,
      idDocumentNumber: "1198012345678001",
      kycStatus: KYC_STATUS.VERIFIED,
    });

    const adminHash = await hashPassword("Admin123");
    admin = await User.create({
      role: ROLES.ADMIN,
      fullName: "Admin User",
      email: "admin@example.com",
      phone: "+250788000002",
      passwordHash: adminHash,
      idDocumentNumber: "1198012345678002",
    });

    // Create a test cycle
    cycle = await Cycle.create({
      farmerId: new mongoose.Types.ObjectId(),
      cycleNumber: "CYCLE-001",
      cycleName: "Test Cycle",
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

  describe("Happy Path Tests (Non-Transaction)", () => {
    it("should update cycle.fundedAmount using updateCycleFundedAmount helper", async () => {
      const initialFunded = cycle.fundedAmount;
      const newAmount = 100000;

      const updatedCycle = await updateCycleFundedAmount(cycle._id, newAmount);

      expect(updatedCycle.fundedAmount).toBe(newAmount);
      expect(updatedCycle.fundedAmount).toBeGreaterThan(initialFunded);
    });

    it("should mark cycle as funded using markCycleFunded helper", async () => {
      cycle.fundedAmount = 500000; // Fully funded
      cycle.status = CYCLE_STATUS.FUNDING;
      await cycle.save();

      const updatedCycle = await markCycleFunded(cycle._id);

      expect(updatedCycle.status).toBe(CYCLE_STATUS.FUNDED);
    });

    it("should create audit log for cycle.funded_amount_updated", async () => {
      const oldValue = { fundedAmount: cycle.fundedAmount };
      const newValue = { fundedAmount: 100000 };

      await writeAuditLog({
        actorId: investor._id,
        action: "cycle.funded_amount_updated",
        entityType: "cycle",
        entityId: cycle._id,
        oldValue,
        newValue,
      });

      const auditLogs = await AuditLog.find({ action: "cycle.funded_amount_updated" });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].actorId.toString()).toBe(investor._id.toString());
      expect(auditLogs[0].newValue.fundedAmount).toBe(newValue.fundedAmount);
    });

    it("should create audit log for investment.confirmed", async () => {
      const oldValue = { status: INVESTMENT_STATUS.PENDING };
      const newValue = { status: INVESTMENT_STATUS.CONFIRMED };

      await writeAuditLog({
        actorId: investor._id,
        action: "investment.confirmed",
        entityType: "investment",
        entityId: new mongoose.Types.ObjectId(),
        oldValue,
        newValue,
      });

      const auditLogs = await AuditLog.find({ action: "investment.confirmed" });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].actorId.toString()).toBe(investor._id.toString());
    });
  });

  describe("Error Cases", () => {
    it("should throw error for non-existent investment", async () => {
      const fakeInvestmentId = new mongoose.Types.ObjectId();

      await expect(confirmInvestment(fakeInvestmentId, investor._id, ROLES.INVESTOR))
        .rejects.toThrow(ApiError);
    });

    it("should throw error for investment already confirmed", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}-1`,
      };

      const investment = await initiateInvestment(investor._id, cycle._id, investmentData);

      // Manually update to confirmed status
      await Investment.findByIdAndUpdate(investment._id, {
        status: INVESTMENT_STATUS.CONFIRMED,
      });

      await expect(confirmInvestment(investment._id, investor._id, ROLES.INVESTOR))
        .rejects.toThrow(`Investment status must be 'pending' to confirm. Current status: ${INVESTMENT_STATUS.CONFIRMED}.`);
    });

    it("should throw error for investor with pending KYC", async () => {
      const investorHash = await hashPassword("Password123");
      const investorPending = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Investor Pending KYC",
        email: "investor2@example.com",
        phone: "+250788000005",
        passwordHash: investorHash,
        idDocumentNumber: "1198012345678005",
        kycStatus: KYC_STATUS.PENDING,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}`,
      };

      await expect(initiateInvestment(investorPending._id, cycle._id, investmentData))
        .rejects.toThrow(new ApiError(400, `Investor KYC status is 'pending'. Please complete verification before investing.`));
    });

    it("should throw error for investor with rejected KYC", async () => {
      const investorHash = await hashPassword("Password123");
      const investorRejected = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Investor Rejected KYC",
        email: "investor3@example.com",
        phone: "+250788000006",
        passwordHash: investorHash,
        idDocumentNumber: "1198012345678006",
        kycStatus: KYC_STATUS.REJECTED,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}-3`,
      };

      await expect(initiateInvestment(investorRejected._id, cycle._id, investmentData))
        .rejects.toThrow(new ApiError(400, `Investor KYC status is 'rejected'. Please contact support to resolve this issue.`));
    });

    it("should throw error for non-investor role", async () => {
      const farmerHash = await hashPassword("Password123");
      const farmer = await User.create({
        role: ROLES.FARMER,
        fullName: "Farmer User",
        email: "farmer@example.com",
        phone: "+250788000007",
        passwordHash: farmerHash,
        idDocumentNumber: "1198012345678007",
        kycStatus: KYC_STATUS.VERIFIED,
        farmerProfile: {
          farmType: "crop",
          location: "Bugesera",
        },
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}-4`,
      };

      await expect(initiateInvestment(farmer._id, cycle._id, investmentData))
        .rejects.toThrow(new ApiError(403, "Only investors can make investments"));
    });

    it("should throw error for funding cap exceeded", async () => {
      // Create investment larger than cycle target
      const investmentData = {
        amount: 600000, // Exceeds target of 500000
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}-5`,
      };

      await expect(
        initiateInvestment(investor._id, cycle._id, investmentData)
      ).rejects.toThrow("Investment of 600000 would exceed cycle targetAmount of 500000 (fundedAmount: 0)");
    });
  });

  describe("Permission Validation", () => {
    it("should reject confirmation by non-owner, non-admin", async () => {
      const investorHash = await hashPassword("Password123");
      const otherInvestor = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Other Investor",
        email: "other@example.com",
        phone: "+250788000008",
        passwordHash: investorHash,
        idDocumentNumber: "1198012345678008",
        kycStatus: KYC_STATUS.VERIFIED,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}-6`,
      };

      const investment = await initiateInvestment(investor._id, cycle._id, investmentData);

      // Other investor tries to confirm
      await expect(confirmInvestment(investment._id, otherInvestor._id, ROLES.INVESTOR))
        .rejects.toThrow("do not have permission");
    });

    it("should allow admin to confirm any investment", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: `REF-${Date.now()}-admin-1`,
      };

      const investment = await initiateInvestment(investor._id, cycle._id, investmentData);

      // Admin confirms the investment
      // Permission check should pass and operation should succeed
      const result = await confirmInvestment(investment._id, admin._id, ROLES.ADMIN);
      expect(result.investment.status).toBe(INVESTMENT_STATUS.CONFIRMED);
      expect(result.cycleFunded).toBe(false); // 100k < 500k target
    });
  });

  describe("markCycleFunded Edge Cases", () => {
    it("should throw an ApiError if fundedAmount < targetAmount", async () => {
      cycle.fundedAmount = 300000; // Not fully funded
      cycle.status = CYCLE_STATUS.FUNDING;
      await cycle.save();

      await expect(markCycleFunded(cycle._id)).rejects.toThrow(new ApiError(400, "Cycle is not fully funded yet"));
    });

    it("should throw an ApiError if status is not FUNDING", async () => {
      cycle.fundedAmount = 500000; // Fully funded
      cycle.status = CYCLE_STATUS.COMPLETED; // Different status
      await cycle.save();

      await expect(markCycleFunded(cycle._id)).rejects.toThrow(new ApiError(400, `Cycle must be in 'funding' status to mark as 'funded'. Current status: ${CYCLE_STATUS.COMPLETED}`));
    });
  });
});
