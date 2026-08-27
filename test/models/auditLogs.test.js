const mongoose = require("mongoose");
const AuditLog = require("../../src/modules/auditLogs/auditLogs.model");
const User = require("../../src/modules/users/users.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("AuditLog Model", () => {
  let actorId;

  beforeEach(async () => {
    await clearDatabase();

    // Create an admin user
    const admin = await new User({
      role: "admin",
      fullName: "Test Admin",
      email: "admin@example.com",
      phone: "+250788000600",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678600",
    }).save();
    actorId = admin._id;
  });

  describe("Valid document creation", () => {
    it("should create a valid audit log with actor", async () => {
      const auditLogData = {
        actorId,
        action: "investment.confirmed",
        entityType: "investment",
        entityId: new mongoose.Types.ObjectId(),
        oldValue: { status: "pending" },
        newValue: { status: "confirmed" },
      };

      const auditLog = new AuditLog(auditLogData);
      const savedLog = await auditLog.save();

      expect(savedLog._id).toBeDefined();
      expect(savedLog.action).toBe("investment.confirmed");
      expect(savedLog.entityType).toBe("investment");
      expect(savedLog.oldValue.status).toBe("pending");
      expect(savedLog.newValue.status).toBe("confirmed");
    });

    it("should create a valid audit log without actor (system action)", async () => {
      const auditLogData = {
        action: "cycle.funded",
        entityType: "cycle",
        entityId: new mongoose.Types.ObjectId(),
        newValue: { status: "funded", fundedAmount: 2000000 },
      };

      const auditLog = new AuditLog(auditLogData);
      const savedLog = await auditLog.save();

      expect(savedLog._id).toBeDefined();
      expect(savedLog.actorId).toBeNull();
      expect(savedLog.action).toBe("cycle.funded");
    });

    it("should create audit log for disbursement action", async () => {
      const auditLogData = {
        actorId,
        action: "disbursement.created",
        entityType: "disbursement",
        entityId: new mongoose.Types.ObjectId(),
        newValue: { amount: 600000, status: "pending" },
      };

      const auditLog = new AuditLog(auditLogData);
      const savedLog = await auditLog.save();

      expect(savedLog.action).toBe("disbursement.created");
      expect(savedLog.entityType).toBe("disbursement");
    });

    it("should create audit log for payout action", async () => {
      const auditLogData = {
        actorId,
        action: "payout.processed",
        entityType: "payout",
        entityId: new mongoose.Types.ObjectId(),
        oldValue: { status: "pending" },
        newValue: { status: "processed", processedAt: new Date() },
      };

      const auditLog = new AuditLog(auditLogData);
      const savedLog = await auditLog.save();

      expect(savedLog.action).toBe("payout.processed");
    });
  });

  describe("Required field validation", () => {
    it("should require action", async () => {
      const auditLogData = {
        entityType: "investment",
        entityId: new mongoose.Types.ObjectId(),
      };

      const auditLog = new AuditLog(auditLogData);
      await expect(auditLog.save()).rejects.toThrow(/action.*required/i);
    });

    it("should require entityType", async () => {
      const auditLogData = {
        action: "investment.confirmed",
        entityId: new mongoose.Types.ObjectId(),
      };

      const auditLog = new AuditLog(auditLogData);
      await expect(auditLog.save()).rejects.toThrow(/entityType.*required/i);
    });

    it("should require entityId", async () => {
      const auditLogData = {
        action: "investment.confirmed",
        entityType: "investment",
      };

      const auditLog = new AuditLog(auditLogData);
      await expect(auditLog.save()).rejects.toThrow(/entityId.*required/i);
    });
  });

  describe("Optional fields", () => {
    it("should allow null actorId for system actions", async () => {
      const auditLogData = {
        action: "system.maintenance",
        entityType: "system",
        entityId: new mongoose.Types.ObjectId(),
      };

      const auditLog = new AuditLog(auditLogData);
      const savedLog = await auditLog.save();

      expect(savedLog.actorId).toBeNull();
    });

    it("should allow null oldValue for create actions", async () => {
      const auditLogData = {
        actorId,
        action: "investment.created",
        entityType: "investment",
        entityId: new mongoose.Types.ObjectId(),
        newValue: { amount: 500000 },
      };

      const auditLog = new AuditLog(auditLogData);
      const savedLog = await auditLog.save();

      expect(savedLog.oldValue).toBeNull();
    });
  });
});
