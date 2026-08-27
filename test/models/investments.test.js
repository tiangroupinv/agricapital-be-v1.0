const mongoose = require("mongoose");
const Investment = require("../../src/modules/investments/investments.model");
const User = require("../../src/modules/users/users.model");
const Cycle = require("../../src/modules/cycles/cycles.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("Investment Model", () => {
  let investorId;
  let cycleId;

  beforeEach(async () => {
    await clearDatabase();

    // Create an investor
    const investor = await new User({
      role: "investor",
      fullName: "Test Investor",
      email: "investor@example.com",
      phone: "+250788000200",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678200",
    }).save();
    investorId = investor._id;

    // Create a farmer
    const farmer = await new User({
      role: "farmer",
      fullName: "Test Farmer",
      email: "farmer2@example.com",
      phone: "+250788000201",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678201",
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
      status: "funding",
      location: "Musanze District",
    }).save();
    cycleId = cycle._id;
  });

  describe("Valid document creation", () => {
    it("should create a valid investment", async () => {
      const investmentData = {
        investorId,
        cycleId,
        amount: 500000,
        paymentMethod: "momo",
        transactionReference: "MOMO-TX-88213",
        status: "pending",
      };

      const investment = new Investment(investmentData);
      const savedInvestment = await investment.save();

      expect(savedInvestment._id).toBeDefined();
      expect(savedInvestment.investorId.toString()).toBe(investorId.toString());
      expect(savedInvestment.cycleId.toString()).toBe(cycleId.toString());
      expect(savedInvestment.amount).toBe(500000);
      expect(savedInvestment.paymentMethod).toBe("momo");
      expect(savedInvestment.status).toBe("pending");
    });

    it("should create investment with bank_transfer method", async () => {
      const investmentData = {
        investorId,
        cycleId,
        amount: 1000000,
        paymentMethod: "bank_transfer",
        status: "pending",
      };

      const investment = new Investment(investmentData);
      const savedInvestment = await investment.save();

      expect(savedInvestment.paymentMethod).toBe("bank_transfer");
    });

    it("should create investment with airtel_money method", async () => {
      const investmentData = {
        investorId,
        cycleId,
        amount: 1000000,
        paymentMethod: "airtel_money",
        status: "pending",
      };

      const investment = new Investment(investmentData);
      const savedInvestment = await investment.save();

      expect(savedInvestment.paymentMethod).toBe("airtel_money");
    });
  });

  describe("Invalid enum rejection", () => {
    it("should reject invalid paymentMethod", async () => {
      const investmentData = {
        investorId,
        cycleId,
        amount: 500000,
        paymentMethod: "invalid_method",
        status: "pending",
      };

      const investment = new Investment(investmentData);
      await expect(investment.save()).rejects.toThrow();
    });

    it("should reject invalid status", async () => {
      const investmentData = {
        investorId,
        cycleId,
        amount: 500000,
        paymentMethod: "momo",
        status: "invalid_status",
      };

      const investment = new Investment(investmentData);
      await expect(investment.save()).rejects.toThrow();
    });
  });

  describe("Required field validation", () => {
    it("should require investorId", async () => {
      const investmentData = {
        cycleId,
        amount: 500000,
        paymentMethod: "momo",
      };

      const investment = new Investment(investmentData);
      await expect(investment.save()).rejects.toThrow(/investorId.*required/i);
    });

    it("should require cycleId", async () => {
      const investmentData = {
        investorId,
        amount: 500000,
        paymentMethod: "momo",
      };

      const investment = new Investment(investmentData);
      await expect(investment.save()).rejects.toThrow(/cycleId.*required/i);
    });

    it("should require amount", async () => {
      const investmentData = {
        investorId,
        cycleId,
        paymentMethod: "momo",
      };

      const investment = new Investment(investmentData);
      await expect(investment.save()).rejects.toThrow(/amount.*required/i);
    });

    it("should require paymentMethod", async () => {
      const investmentData = {
        investorId,
        cycleId,
        amount: 500000,
      };

      const investment = new Investment(investmentData);
      await expect(investment.save()).rejects.toThrow(/paymentMethod.*required/i);
    });
  });

  describe("Min value validation", () => {
    it("should reject negative amount", async () => {
      const investmentData = {
        investorId,
        cycleId,
        amount: -100,
        paymentMethod: "momo",
      };

      const investment = new Investment(investmentData);
      await expect(investment.save()).rejects.toThrow();
    });
  });
});
