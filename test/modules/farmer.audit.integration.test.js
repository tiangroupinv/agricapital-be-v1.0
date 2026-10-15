// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-farmer-testing";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/modules/users/users.model");
const AuditLog = require("../../src/modules/auditLogs/auditLogs.model");
const { hashPassword } = require("../../src/utils/hash");
const { signToken } = require("../../src/utils/jwt");
const { clearDatabase } = require("../setup/testDatabase");
const { ROLES } = require("../../src/constants");

describe("Farmer Management - Audit Logging Integration", () => {
  let fieldAgent;
  let fieldAgentToken;
  let admin;
  let adminToken;

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
  });

  describe("POST /api/farmers - Audit Log Creation", () => {
    it("should create audit log on farmer creation", async () => {
      const farmerData = {
        fullName: "John Farmer",
        email: "john.farmer@test.com",
        phone: "+250788111111",
        password: "password123",
        idDocumentNumber: "ID123456789",
        farmerProfile: {
          location: "Kigali, Rwanda",
          farmType: "crop",
          cooperativeName: "Test Cooperative",
        },
      };

      const response = await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(farmerData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.role).toBe("farmer");
      expect(response.body.data.kycStatus).toBe("not_required");

      // Check audit log was created
      const auditLogs = await AuditLog.find({ entityId: response.body.data._id });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe("farmer.created");
      expect(auditLogs[0].entityType).toBe("user");
      expect(auditLogs[0].actorId.toString()).toBe(fieldAgent._id.toString());
      expect(auditLogs[0].newValue).toBeDefined();
      expect(auditLogs[0].newValue.fullName).toBe("John Farmer");
      expect(auditLogs[0].newValue.role).toBe("farmer");
      expect(auditLogs[0].newValue.kycStatus).toBe("not_required");
    });

    it("should create audit log when admin creates farmer", async () => {
      const farmerData = {
        fullName: "Admin Created Farmer",
        email: "admincreated@test.com",
        phone: "+250788222222",
        password: "password123",
        idDocumentNumber: "ID987654321",
        farmerProfile: {
          location: "Musanze, Rwanda",
          farmType: "livestock",
        },
      };

      const response = await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(farmerData)
        .expect(201);

      const auditLogs = await AuditLog.find({ entityId: response.body.data._id });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe("farmer.created");
      expect(auditLogs[0].actorId.toString()).toBe(admin._id.toString());
    });
  });

  describe("PATCH /api/farmers/:id - Audit Log Update", () => {
    let farmer;

    beforeEach(async () => {
      const farmerPasswordHash = await hashPassword("password123");
      farmer = await User.create({
        role: ROLES.FARMER,
        fullName: "Original Farmer",
        email: "farmer@test.com",
        phone: "+250788333333",
        passwordHash: farmerPasswordHash,
        idDocumentNumber: "ID111222333",
        farmerProfile: {
          location: "Huye, Rwanda",
          farmType: "crop",
          cooperativeName: "Original Cooperative",
        },
        kycStatus: "not_required",
        isActive: true,
      });
    });

    it("should create audit log with oldValue and newValue on farmer update", async () => {
      const updateData = {
        fullName: "Updated Farmer",
        phone: "+250788444444",
        farmerProfile: {
          location: "Rubavu, Rwanda",
          farmType: "livestock",
          cooperativeName: "Updated Cooperative",
        },
      };

      const response = await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.fullName).toBe("Updated Farmer");
      expect(response.body.data.phone).toBe("+250788444444");
      expect(response.body.data.farmerProfile.farmType).toBe("livestock");

      // Check audit log was created with oldValue and newValue
      const auditLogs = await AuditLog.find({ entityId: farmer._id }).sort({
        createdAt: -1,
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe("farmer.updated");
      expect(auditLogs[0].entityType).toBe("user");
      expect(auditLogs[0].actorId.toString()).toBe(fieldAgent._id.toString());

      // Verify oldValue contains original data
      expect(auditLogs[0].oldValue.fullName).toBe("Original Farmer");
      expect(auditLogs[0].oldValue.phone).toBe("+250788333333");
      expect(auditLogs[0].oldValue.farmerProfile.location).toBe("Huye, Rwanda");
      expect(auditLogs[0].oldValue.farmerProfile.farmType).toBe("crop");
      expect(auditLogs[0].oldValue.farmerProfile.cooperativeName).toBe(
        "Original Cooperative"
      );

      // Verify newValue contains updated data
      expect(auditLogs[0].newValue.fullName).toBe("Updated Farmer");
      expect(auditLogs[0].newValue.phone).toBe("+250788444444");
      expect(auditLogs[0].newValue.farmerProfile.location).toBe("Rubavu, Rwanda");
      expect(auditLogs[0].newValue.farmerProfile.farmType).toBe("livestock");
      expect(auditLogs[0].newValue.farmerProfile.cooperativeName).toBe(
        "Updated Cooperative"
      );
    });

    it("should create audit log even for partial updates", async () => {
      const updateData = {
        fullName: "Partially Updated Farmer",
      };

      await request(app)
        .patch(`/api/farmers/${farmer._id}`)
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(updateData)
        .expect(200);

      const auditLogs = await AuditLog.find({ entityId: farmer._id }).sort({
        createdAt: -1,
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe("farmer.updated");
      expect(auditLogs[0].oldValue.fullName).toBe("Original Farmer");
      expect(auditLogs[0].newValue.fullName).toBe("Partially Updated Farmer");
      // Other fields should remain the same in newValue
      expect(auditLogs[0].newValue.phone).toBe("+250788333333");
    });
  });

  describe("Audit Log Immutability", () => {
    let farmer;
    let auditLog;

    beforeEach(async () => {
      const fieldAgentPasswordHash = await hashPassword("password123");
      fieldAgent = await User.create({
        role: ROLES.FIELD_AGENT,
        fullName: "Test Field Agent",
        email: "fieldagent2@test.com",
        phone: "+250788999999",
        passwordHash: fieldAgentPasswordHash,
        idDocumentNumber: "ID999999999",
        kycStatus: "verified",
        isActive: true,
      });
      fieldAgentToken = signToken({ userId: fieldAgent._id, role: fieldAgent.role });

      // Create a farmer to generate audit log
      await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send({
          fullName: "Immutable Test Farmer",
          email: "immutable@test.com",
          phone: "+250788888888",
          password: "password123",
          idDocumentNumber: "ID888888888",
          farmerProfile: {
            location: "Nyamata, Rwanda",
            farmType: "crop",
          },
        });

      auditLog = await AuditLog.findOne({ action: "farmer.created" });
    });

    it("should prevent update of audit log documents via findByIdAndUpdate", async () => {
      await expect(
        AuditLog.findByIdAndUpdate(auditLog._id, { action: "modified" })
      ).rejects.toThrow("Audit logs are immutable and cannot be updated");
    });

    it("should prevent deletion of audit log documents via findByIdAndDelete", async () => {
      await expect(AuditLog.findByIdAndDelete(auditLog._id)).rejects.toThrow(
        "Audit logs are immutable and cannot be deleted"
      );
    });

    it("should prevent updateOne on audit logs", async () => {
      await expect(
        AuditLog.updateOne({ _id: auditLog._id }, { action: "modified" })
      ).rejects.toThrow("Audit logs are immutable and cannot be updated");
    });

    it("should prevent deleteOne on audit logs", async () => {
      await expect(AuditLog.deleteOne({ _id: auditLog._id })).rejects.toThrow(
        "Audit logs are immutable and cannot be deleted"
      );
    });
  });

  describe("Atomic Audit Log Write (Transaction)", () => {
    it("should create both user and audit log atomically", async () => {
      const farmerData = {
        fullName: "Transaction Test Farmer",
        email: "transaction@test.com",
        phone: "+250788777777",
        password: "password123",
        idDocumentNumber: "ID888888888",
        farmerProfile: {
          location: "Kayonza, Rwanda",
          farmType: "livestock",
        },
      };

      const response = await request(app)
        .post("/api/farmers")
        .set("Authorization", `Bearer ${fieldAgentToken}`)
        .send(farmerData)
        .expect(201);

      // Both user and audit log should exist
      const farmer = await User.findById(response.body.data._id);
      expect(farmer).toBeDefined();

      const auditLogs = await AuditLog.find({ entityId: farmer._id });
      expect(auditLogs).toHaveLength(1);
    });
  });
});