const mongoose = require("mongoose");
const Payout = require("../../src/modules/payouts/payouts.model");
const User = require("../../src/modules/users/users.model");
const Cycle = require("../../src/modules/cycles/cycles.model");
const Investment = require("../../src/modules/investments/investments.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("Payout Model", () => {
  let cycleId;
  let investorId;
  let investmentId;

  beforeEach(async () => {
    await clearDatabase();

    // Create a farmer
    const farmer = await new User({
      role: "farmer",
      fullName: "Test Farmer",
      email: "farmer@example.com",
      phone: "+250788000500",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678500",
      farmerProfile: {
        location: "Musanze District",
        farmType: "livestock",
      },
    }).save();

    // Create a cycle
    const cycle = await new Cycle({
      farmerId: farmer._id,
      type: "livestock",
      purpose: "feeds",
      targetAmount: 2000000,
      status: "completed",
      location: "Musanze District",
    }).save();
    cycleId = cycle._id;

    // Create an investor
    const investor = await new User({
      role: "investor",
      fullName: "Test Investor",
      email: "investor@example.com",
      phone: "+250788000501",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678501",
    }).save();
    investorId = investor._id;

    // Create an investment
    const investment = await new Investment({
      investorId,
      cycleId,
      amount: 500000,
      paymentMethod: "momo",
      status: "confirmed",
    }).save();
    investmentId = investment._id;
  });

  describe("Valid document creation", () => {
    it("should create a valid payout", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875, // 12.5% of gross
        brokerageFeeAmount: 20125, // 3.5% of gross
        netPayoutAmount: 483000, // gross - platform - brokerage
        status: "pending",
      };

      const payout = new Payout(payoutData);
      const savedPayout = await payout.save();

      expect(savedPayout._id).toBeDefined();
      expect(savedPayout.cycleId.toString()).toBe(cycleId.toString());
      expect(savedPayout.investorId.toString()).toBe(investorId.toString());
      expect(savedPayout.investmentId.toString()).toBe(investmentId.toString());
      expect(savedPayout.grossReturnAmount).toBe(575000);
      expect(savedPayout.platformFeeAmount).toBe(71875);
      expect(savedPayout.brokerageFeeAmount).toBe(20125);
      expect(savedPayout.netPayoutAmount).toBe(483000);
      expect(savedPayout.status).toBe("pending");
    });
  });

  describe("Invalid enum rejection", () => {
    it("should reject invalid status", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
        status: "invalid_status",
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow();
    });
  });

  describe("Required field validation", () => {
    it("should require cycleId", async () => {
      const payoutData = {
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow(/cycleId.*required/i);
    });

    it("should require investorId", async () => {
      const payoutData = {
        cycleId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow(/investorId.*required/i);
    });

    it("should require investmentId", async () => {
      const payoutData = {
        cycleId,
        investorId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow(/investmentId.*required/i);
    });

    it("should require grossReturnAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow(/grossReturnAmount.*required/i);
    });

    it("should require platformFeeAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow(/platformFeeAmount.*required/i);
    });

    it("should require brokerageFeeAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow(/brokerageFeeAmount.*required/i);
    });

    it("should require netPayoutAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow(/netPayoutAmount.*required/i);
    });
  });

  describe("Min value validation", () => {
    it("should reject negative grossReturnAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: -100,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow();
    });

    it("should reject negative platformFeeAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: -100,
        brokerageFeeAmount: 20125,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow();
    });

    it("should reject negative brokerageFeeAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        brokerageFeeAmount: -100,
        netPayoutAmount: 483000,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow();
    });

    it("should reject negative netPayoutAmount", async () => {
      const payoutData = {
        cycleId,
        investorId,
        investmentId,
        grossReturnAmount: 575000,
        platformFeeAmount: 71875,
        brokerageFeeAmount: 20125,
        netPayoutAmount: -100,
      };

      const payout = new Payout(payoutData);
      await expect(payout.save()).rejects.toThrow();
    });
  });
});
