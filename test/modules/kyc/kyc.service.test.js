/**
 * KYC Service Tests
 * @see .kiro/specs/investor-kyc-profile/design.md (Property 3, 11, 14, etc.)
 */

process.env.JWT_SECRET = "test-jwt-secret";

const mongoose = require("mongoose");
const User = require("../../../src/modules/users/users.model");
const AuditLog = require("../../../src/modules/auditLogs/auditLogs.model");
const Investment = require("../../../src/modules/investments/investments.model");
const kycService = require("../../../src/modules/kyc/kyc.service");
const { hashPassword } = require("../../../src/utils/hash");
const { clearDatabase } = require("../../setup/testDatabase");

describe("KYC Service", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("submitKycProfile (Req 1, 6)", () => {
    let investor;
    beforeEach(async () => {
      investor = await User.create({
        role: "investor",
        fullName: "Test Investor",
        email: "test@example.com",
        phone: "+250788000001",
        passwordHash: await hashPassword("SecurePass123"),
        idDocumentNumber: "1198012345678001",
        kycStatus: "not_required",
      });
    });

    it("should submit KYC and set status to pending", async () => {
      const res = await kycService.submitKycProfile(investor._id, "investor", investor._id, {
        fullName: "Updated Name",
      });
      expect(res.kycStatus).toBe("pending");
      expect(res.fullName).toBe("Updated Name");
    });

    it("should reject admin calling investor endpoint", async () => {
      await expect(
        kycService.submitKycProfile("000000000000000000000000", "admin", investor._id, { fullName: "X" })
      ).rejects.toThrow("This endpoint is for investors only.");
    });

    it("should reject non-owner investor", async () => {
      const other = await User.create({
        role: "investor", fullName: "Other", email: "o@o.com", phone: "+250788000002",
        passwordHash: await hashPassword("p"), idDocumentNumber: "1",
      });
      await expect(
        kycService.submitKycProfile(other._id, "investor", investor._id, { fullName: "X" })
      ).rejects.toThrow("You do not have permission to update this profile.");
    });

    it("should reject forbidden fields", async () => {
      await expect(
        kycService.submitKycProfile(investor._id, "investor", investor._id, { kycStatus: "verified" })
      ).rejects.toThrow("Field 'kycStatus' cannot be updated through this endpoint.");
    });

    it("should reject empty payload", async () => {
      await expect(
        kycService.submitKycProfile(investor._id, "investor", investor._id, {})
      ).rejects.toThrow("At least one KYC field must be provided.");
    });

    it("should reject verified investor resubmission", async () => {
      await User.findByIdAndUpdate(investor._id, { kycStatus: "verified" });
      await expect(
        kycService.submitKycProfile(investor._id, "investor", investor._id, { fullName: "X" })
      ).rejects.toThrow("KYC already verified.");
    });
  });

  describe("getKycProfile (Req 2)", () => {
    it("should return profile with null for unset fields", async () => {
      const u = await User.create({
        role: "investor", fullName: "A", email: "a@a.com", phone: "+250788001",
        passwordHash: await hashPassword("p"), idDocumentNumber: "1", kycStatus: "pending",
      });
      const res = await kycService.getKycProfile(u._id, "investor", u._id);
      expect(res.kycStatus).toBe("pending");
      expect(res.email).toBeUndefined();
    });
  });

  describe("updateKycStatus (Req 3)", () => {
    it("should allow admin to set verified", async () => {
      const admin = await User.create({
        role: "admin", fullName: "Admin", email: "adm@adm.com", phone: "+250788002",
        passwordHash: await hashPassword("p"), idDocumentNumber: "2",
      });
      const inv = await User.create({
        role: "investor", fullName: "Inv", email: "inv@inv.com", phone: "+250788003",
        passwordHash: await hashPassword("p"), idDocumentNumber: "3", kycStatus: "pending",
      });
      const res = await kycService.updateKycStatus(admin._id, inv._id, "verified");
      expect(res.kycStatus).toBe("verified");
    });

    it("should reject non-admin", async () => {
      const inv = await User.create({ role: "investor", fullName: "I", email: "i@i.com", phone: "+250788004", passwordHash: await hashPassword("p"), idDocumentNumber: "4" });
      await expect(kycService.updateKycStatus(inv._id, inv._id, "verified")).rejects.toThrow("permission");
    });
  });

  describe("confirmInvestment (Req 5)", () => {
    it("should confirm for verified investor", async () => {
      const inv = await User.create({ role: "investor", fullName: "Inv", email: "inv2@inv.com", phone: "+250788005", passwordHash: await hashPassword("p"), idDocumentNumber: "5", kycStatus: "verified" });
      const cycle = await new (require("../../../src/modules/cycles/cycles.model"))({ farmerId: inv._id, type: "crop", targetAmount: 100000, status: "funded", location: "Musanze", purpose: "seeds" }).save();
      const investment = await Investment.create({ investorId: inv._id, cycleId: cycle._id, amount: 50000, paymentMethod: "momo", status: "pending" });
      const res = await kycService.confirmInvestment(inv._id, investment._id);
      expect(res.status).toBe("confirmed");
    });
  });
});
