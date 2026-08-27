const mongoose = require("mongoose");
const Disbursement = require("../../src/modules/disbursements/disbursements.model");
const User = require("../../src/modules/users/users.model");
const Cycle = require("../../src/modules/cycles/cycles.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("Disbursement Model", () => {
  let cycleId;
  let adminId;

  beforeEach(async () => {
    await clearDatabase();

    // Create a farmer
    const farmer = await new User({
      role: "farmer",
      fullName: "Test Farmer",
      email: "farmer@example.com",
      phone: "+250788000300",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678300",
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
      status: "in_progress",
      location: "Musanze District",
    }).save();
    cycleId = cycle._id;

    // Create an admin
    const admin = await new User({
      role: "admin",
      fullName: "Test Admin",
      email: "admin@example.com",
      phone: "+250788000301",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678301",
    }).save();
    adminId = admin._id;
  });

  describe("Valid document creation", () => {
    it("should create a valid disbursement", async () => {
      const disbursementData = {
        cycleId,
        amount: 600000,
        purpose: "Dairy feed purchase - batch 1",
        method: "momo",
        approvedBy: adminId,
        status: "completed",
      };

      const disbursement = new Disbursement(disbursementData);
      const savedDisbursement = await disbursement.save();

      expect(savedDisbursement._id).toBeDefined();
      expect(savedDisbursement.cycleId.toString()).toBe(cycleId.toString());
      expect(savedDisbursement.amount).toBe(600000);
      expect(savedDisbursement.purpose).toBe("Dairy feed purchase - batch 1");
      expect(savedDisbursement.method).toBe("momo");
      expect(savedDisbursement.status).toBe("completed");
    });

    it("should create disbursement with bank_transfer method", async () => {
      const disbursementData = {
        cycleId,
        amount: 600000,
        purpose: "Equipment purchase",
        method: "bank_transfer",
        approvedBy: adminId,
      };

      const disbursement = new Disbursement(disbursementData);
      const savedDisbursement = await disbursement.save();

      expect(savedDisbursement.method).toBe("bank_transfer");
    });
  });

  describe("Invalid enum rejection", () => {
    it("should reject invalid method", async () => {
      const disbursementData = {
        cycleId,
        amount: 600000,
        purpose: "Test purpose",
        method: "invalid_method",
        approvedBy: adminId,
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow();
    });

    it("should reject invalid status", async () => {
      const disbursementData = {
        cycleId,
        amount: 600000,
        purpose: "Test purpose",
        method: "momo",
        approvedBy: adminId,
        status: "invalid_status",
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow();
    });
  });

  describe("Required field validation", () => {
    it("should require cycleId", async () => {
      const disbursementData = {
        amount: 600000,
        purpose: "Test purpose",
        method: "momo",
        approvedBy: adminId,
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow(/cycleId.*required/i);
    });

    it("should require amount", async () => {
      const disbursementData = {
        cycleId,
        purpose: "Test purpose",
        method: "momo",
        approvedBy: adminId,
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow(/amount.*required/i);
    });

    it("should require purpose", async () => {
      const disbursementData = {
        cycleId,
        amount: 600000,
        method: "momo",
        approvedBy: adminId,
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow(/purpose.*required/i);
    });

    it("should require method", async () => {
      const disbursementData = {
        cycleId,
        amount: 600000,
        purpose: "Test purpose",
        approvedBy: adminId,
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow(/method.*required/i);
    });

    it("should require approvedBy", async () => {
      const disbursementData = {
        cycleId,
        amount: 600000,
        purpose: "Test purpose",
        method: "momo",
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow(/approvedBy.*required/i);
    });
  });

  describe("Min value validation", () => {
    it("should reject negative amount", async () => {
      const disbursementData = {
        cycleId,
        amount: -100,
        purpose: "Test purpose",
        method: "momo",
        approvedBy: adminId,
      };

      const disbursement = new Disbursement(disbursementData);
      await expect(disbursement.save()).rejects.toThrow();
    });
  });
});
