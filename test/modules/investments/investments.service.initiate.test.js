// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-investments-testing";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const {
  initiateInvestment,
  confirmInvestment,
  updateCycleFundedAmount,
  markCycleFunded,
  checkFundingCap,
  writeAuditLog,
  buildKycErrorMessage,
  buildFundingCapErrorMessage,
} = require("../../../src/modules/investments/investments.service");
const User = require("../../../src/modules/users/users.model");
const Cycle = require("../../../src/modules/cycles/cycles.model");
const Investment = require("../../../src/modules/investments/investments.model");
const AuditLog = require("../../../src/modules/auditLogs/auditLogs.model");
const { hashPassword } = require("../../../src/utils/hash");
const { signToken } = require("../../../src/utils/jwt");
const { clearDatabase } = require("../../setup/testDatabase");
const { ROLES, KYC_STATUS, CYCLE_STATUS, INVESTMENT_STATUS, PAYMENT_METHODS_LIST } = require("../../../src/constants");

describe("Investments Service - initiateInvestment", () => {
  let investor;
  let cycle;
  let fieldAgent;
  let admin;

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

    // Create farmer
    const farmerHash = await hashPassword("Password123");
    const farmer = await User.create({
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

    // Create investor with VERIFIED KYC
    const investorHash = await hashPassword("Password123");
    investor = await User.create({
      role: ROLES.INVESTOR,
      fullName: "Investor Jane",
      email: "investor@example.com",
      phone: "+250788000004",
      passwordHash: investorHash,
      idDocumentNumber: "1198012345678004",
      kycStatus: KYC_STATUS.VERIFIED,
    });

    // Create a cycle in FUNDING status
    cycle = await Cycle.create({
      farmerId: farmer._id,
      fieldAgentIds: [fieldAgent._id],
      type: "crop",
      purpose: "seeds",
      targetAmount: 500000,
      fundedAmount: 0,
      location: "Musanze",
      status: CYCLE_STATUS.FUNDING,
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

  describe("Happy Path", () => {
    it("should create a pending investment with valid data and verified KYC", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-123456789",
      };

      const investment = await initiateInvestment(investor._id, cycle._id, investmentData);

      expect(investment).toBeDefined();
      expect(investment.investorId.toString()).toBe(investor._id.toString());
      expect(investment.cycleId.toString()).toBe(cycle._id.toString());
      expect(investment.amount).toBe(100000);
      expect(investment.paymentMethod).toBe("momo");
      expect(investment.transactionReference).toBe("MTN-123456789");
      expect(investment.status).toBe(INVESTMENT_STATUS.PENDING);
      expect(investment.confirmedAt).toBeNull();
    });

    it("should create audit log for investment initiation", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-123456789",
      };

      await initiateInvestment(investor._id, cycle._id, investmentData);

      const auditLogs = await AuditLog.find({ action: "investment.initiated" });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].actorId.toString()).toBe(investor._id.toString());
      expect(auditLogs[0].entityType).toBe("investment");
      expect(auditLogs[0].newValue.amount).toBe(100000);
      expect(auditLogs[0].newValue.status).toBe(INVESTMENT_STATUS.PENDING);
    });

    it("should accept investor with kycStatus 'not_required'", async () => {
      // Create investor with not_required KYC
      const investorHash = await hashPassword("Password123");
      const investorNotRequired = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Investor No KYC",
        email: "investor2@example.com",
        phone: "+250788000005",
        passwordHash: investorHash,
        idDocumentNumber: "1198012345678005",
        kycStatus: KYC_STATUS.NOT_REQUIRED,
      });

      const investmentData = {
        amount: 50000,
        paymentMethod: "bank_transfer",
        transactionReference: "BK-987654321",
      };

      const investment = await initiateInvestment(investorNotRequired._id, cycle._id, investmentData);

      expect(investment.status).toBe(INVESTMENT_STATUS.PENDING);
    });

    it("should accept all valid payment methods", async () => {
      for (const method of PAYMENT_METHODS_LIST) {
        // Create a new cycle for each payment method to avoid compound unique index conflict
        const farmerHash = await hashPassword("Password123");
        const farmer = await User.create({
          role: ROLES.FARMER,
          fullName: `Farmer ${method}`,
          email: `farmer${method}@example.com`,
          phone: `+25078800${String(Date.now()).slice(-5)}`,
          passwordHash: farmerHash,
          idDocumentNumber: `1198012345678${String(Date.now()).slice(-4)}`,
          farmerProfile: { location: "Musanze", farmType: "crop" },
        });
        
        const newCycle = await Cycle.create({
          farmerId: farmer._id,
          fieldAgentIds: [fieldAgent._id],
          type: "crop",
          purpose: "seeds",
          targetAmount: 500000,
          fundedAmount: 0,
          location: "Musanze",
          status: CYCLE_STATUS.FUNDING,
          offTakerAgreement: {
            buyerName: "Rwanda Trading Co",
            buyerType: "exporter",
            product: "Maize",
            pricePerUnit: 350,
            quantity: 1000,
            contractReference: `RTC-2024-${method.toUpperCase()}`,
          },
        });

        const investmentData = {
          amount: 50000,
          paymentMethod: method,
          transactionReference: `${method.toUpperCase()}-${Date.now()}`,
        };

        const investment = await initiateInvestment(investor._id, newCycle._id, investmentData);
        expect(investment.paymentMethod).toBe(method);
      }
    });
  });

  describe("Error Cases - KYC Validation", () => {
    it("should reject investor with KYC status 'pending'", async () => {
      const investorHash = await hashPassword("Password123");
      const investorPending = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Investor Pending",
        email: "pending@example.com",
        phone: "+250788000010",
        passwordHash: investorHash,
        idDocumentNumber: "1198012345678010",
        kycStatus: KYC_STATUS.PENDING,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-111111111",
      };

      await expect(initiateInvestment(investorPending._id, cycle._id, investmentData))
        .rejects.toThrow("KYC status is 'pending'");
    });

    it("should reject investor with KYC status 'rejected'", async () => {
      const investorHash = await hashPassword("Password123");
      const investorRejected = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Investor Rejected",
        email: "rejected@example.com",
        phone: "+250788000011",
        passwordHash: investorHash,
        idDocumentNumber: "1198012345678011",
        kycStatus: KYC_STATUS.REJECTED,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-222222222",
      };

      await expect(initiateInvestment(investorRejected._id, cycle._id, investmentData))
        .rejects.toThrow("KYC status is 'rejected'");
    });
  });

  describe("Error Cases - Investor Validation", () => {
    it("should reject non-existent investor", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-333333333",
      };

      await expect(initiateInvestment(fakeId, cycle._id, investmentData))
        .rejects.toThrow("Investor not found");
    });

    it("should reject inactive investor", async () => {
      const investorHash = await hashPassword("Password123");
      const inactiveInvestor = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Inactive Investor",
        email: "inactive@example.com",
        phone: "+250788000012",
        passwordHash: investorHash,
        idDocumentNumber: "1198012345678012",
        kycStatus: KYC_STATUS.VERIFIED,
        isActive: false,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-444444444",
      };

      await expect(initiateInvestment(inactiveInvestor._id, cycle._id, investmentData))
        .rejects.toThrow("Investor not found");
    });

    it("should reject non-investor role", async () => {
      const farmerHash = await hashPassword("Password123");
      const farmer = await User.create({
        role: ROLES.FARMER,
        fullName: "Farmer Test",
        email: "farmer@test.com",
        phone: "+250788000013",
        passwordHash: farmerHash,
        idDocumentNumber: "1198012345678013",
        kycStatus: KYC_STATUS.VERIFIED,
        farmerProfile: { location: "Kigali", farmType: "crop" },
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-555555555",
      };

      await expect(initiateInvestment(farmer._id, cycle._id, investmentData))
        .rejects.toThrow("Only investors can make investments");
    });
  });

  describe("Error Cases - Cycle Validation", () => {
    it("should reject non-existent cycle", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-666666666",
      };

      await expect(initiateInvestment(investor._id, fakeId, investmentData))
        .rejects.toThrow("Cycle not found");
    });

    it("should reject cycle not in investable status (DRAFT)", async () => {
      const farmerHash = await hashPassword("Password123");
      const farmer = await User.create({
        role: ROLES.FARMER,
        fullName: "Farmer Draft",
        email: "draft@example.com",
        phone: "+250788000014",
        passwordHash: farmerHash,
        idDocumentNumber: "1198012345678014",
        farmerProfile: { location: "Kigali", farmType: "crop" },
      });

      const draftCycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Kigali",
        status: CYCLE_STATUS.DRAFT,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-777777777",
      };

      await expect(initiateInvestment(investor._id, draftCycle._id, investmentData))
        .rejects.toThrow("not in investable status");
    });

    it("should reject cycle not in investable status (UNDER_REVIEW)", async () => {
      const farmerHash = await hashPassword("Password123");
      const farmer = await User.create({
        role: ROLES.FARMER,
        fullName: "Farmer Review",
        email: "review@example.com",
        phone: "+250788000015",
        passwordHash: farmerHash,
        idDocumentNumber: "1198012345678015",
        farmerProfile: { location: "Kigali", farmType: "crop" },
      });

      const reviewCycle = await Cycle.create({
        farmerId: farmer._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        location: "Kigali",
        status: CYCLE_STATUS.UNDER_REVIEW,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-888888888",
      };

      await expect(initiateInvestment(investor._id, reviewCycle._id, investmentData))
        .rejects.toThrow("not in investable status");
    });

    it("should accept cycle in FUNDED status", async () => {
      const fundedCycle = await Cycle.create({
        farmerId: (await User.findOne({ role: ROLES.FARMER }))._id,
        fieldAgentIds: [fieldAgent._id],
        type: "crop",
        purpose: "seeds",
        targetAmount: 500000,
        fundedAmount: 500000,
        location: "Kigali",
        status: CYCLE_STATUS.FUNDED,
      });

      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-999999999",
      };

      // Note: funding cap will be checked next
      // But cycle status should be accepted
      await expect(initiateInvestment(investor._id, fundedCycle._id, investmentData))
        .rejects.toThrow("exceed cycle targetAmount"); // funding cap check fails
    });
  });

  describe("Error Cases - Amount & Payment Validation", () => {
    it("should reject amount <= 0", async () => {
      const investmentData = {
        amount: 0,
        paymentMethod: "momo",
        transactionReference: "MTN-000000000",
      };

      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("amount must be greater than zero");
    });

    it("should reject negative amount", async () => {
      const investmentData = {
        amount: -1000,
        paymentMethod: "momo",
        transactionReference: "MTN-000000001",
      };

      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("amount must be greater than zero");
    });

    it("should reject invalid payment method", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "invalid_method",
        transactionReference: "MTN-111111112",
      };

      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("Invalid payment method");
    });

    it("should reject missing transactionReference", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "",
      };

      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("transactionReference is required");
    });

    it("should reject whitespace-only transactionReference", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "   ",
      };

      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("transactionReference is required");
    });
  });

  describe("Error Cases - Duplicate Transaction Reference", () => {
    it("should reject duplicate transactionReference for pending investment", async () => {
      const investmentData = {
        amount: 100000,
        paymentMethod: "momo",
        transactionReference: "MTN-DUPLICATE-TEST",
      };

      // Create first investment
      await initiateInvestment(investor._id, cycle._id, investmentData);

      // Try to create second with same transactionReference
      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("already been used for an investment");
    });

    // TODO: Fix transaction test for mongodb-memory-server
    // it("should reject duplicate transactionReference for confirmed investment", async () => {
    //   const investmentData = {
    //     amount: 100000,
    //     paymentMethod: "momo",
    //     transactionReference: "MTN-DUPLICATE-CONFIRMED",
    //   };

    //   // Create and confirm first investment
    //   const investment = await initiateInvestment(investor._id, cycle._id, investmentData);
    //   await confirmInvestment(investment._id, investor._id, ROLES.INVESTOR);

    //   // Try to create second with same transactionReference
    //   await expect(initiateInvestment(investor._id, cycle._id, investmentData))
    //     .rejects.toThrow("already been used for an investment");
    // });
  });

  describe("Error Cases - Funding Cap", () => {
    it("should reject investment that exceeds funding cap", async () => {
      const investmentData = {
        amount: 600000, // Exceeds targetAmount of 500000
        paymentMethod: "momo",
        transactionReference: "MTN-OVERCAP-001",
      };

      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("exceed cycle targetAmount");
    });

    it("should reject investment that exactly reaches cap if already funded", async () => {
      // Update cycle to have some funded amount
      await Cycle.findByIdAndUpdate(cycle._id, { fundedAmount: 450000 });

      const investmentData = {
        amount: 100000, // Would make fundedAmount = 550000 > 500000
        paymentMethod: "momo",
        transactionReference: "MTN-OVERCAP-002",
      };

      await expect(initiateInvestment(investor._id, cycle._id, investmentData))
        .rejects.toThrow("exceed cycle targetAmount");
    });

    it("should accept investment that exactly fills remaining capacity", async () => {
      // Update cycle to have 450000 funded, 50000 remaining
      await Cycle.findByIdAndUpdate(cycle._id, { fundedAmount: 450000 });

      const investmentData = {
        amount: 50000, // Exactly fills remaining
        paymentMethod: "momo",
        transactionReference: "MTN-EXACT-FILL",
      };

      const investment = await initiateInvestment(investor._id, cycle._id, investmentData);
      expect(investment.status).toBe(INVESTMENT_STATUS.PENDING);
    });
  });
});