const mongoose = require("mongoose");
const ProgressUpdate = require("../../src/modules/progressUpdates/progressUpdates.model");
const User = require("../../src/modules/users/users.model");
const Cycle = require("../../src/modules/cycles/cycles.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("ProgressUpdate Model", () => {
  let cycleId;
  let fieldAgentId;

  beforeEach(async () => {
    await clearDatabase();

    // Create a farmer
    const farmer = await new User({
      role: "farmer",
      fullName: "Test Farmer",
      email: "farmer@example.com",
      phone: "+250788000400",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678400",
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

    // Create a field agent
    const fieldAgent = await new User({
      role: "field_agent",
      fullName: "Test Field Agent",
      email: "fieldagent@example.com",
      phone: "+250788000401",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678401",
    }).save();
    fieldAgentId = fieldAgent._id;
  });

  describe("Valid document creation", () => {
    it("should create a valid progress update", async () => {
      const progressData = {
        cycleId,
        fieldAgentId,
        updateType: "health_check",
        notes: "Cows appear healthy, vaccinations on schedule.",
        photoUrls: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
        visitDate: new Date("2026-11-15"),
      };

      const progressUpdate = new ProgressUpdate(progressData);
      const savedUpdate = await progressUpdate.save();

      expect(savedUpdate._id).toBeDefined();
      expect(savedUpdate.cycleId.toString()).toBe(cycleId.toString());
      expect(savedUpdate.updateType).toBe("health_check");
      expect(savedUpdate.notes).toBe("Cows appear healthy, vaccinations on schedule.");
      expect(savedUpdate.photoUrls).toHaveLength(2);
    });

    it("should create progress update without photos", async () => {
      const progressData = {
        cycleId,
        fieldAgentId,
        updateType: "vaccination",
        notes: "Vaccinations completed for all animals.",
        visitDate: new Date("2026-11-20"),
      };

      const progressUpdate = new ProgressUpdate(progressData);
      const savedUpdate = await progressUpdate.save();

      expect(savedUpdate._id).toBeDefined();
      expect(savedUpdate.updateType).toBe("vaccination");
    });

    it("should create progress update for each updateType", async () => {
      const updateTypes = ["health_check", "growth_stage", "vaccination", "harvest", "incident"];

      for (const updateType of updateTypes) {
        const progressData = {
          cycleId,
          fieldAgentId,
          updateType,
          visitDate: new Date(),
        };

        const progressUpdate = new ProgressUpdate(progressData);
        const savedUpdate = await progressUpdate.save();

        expect(savedUpdate.updateType).toBe(updateType);
      }
    });
  });

  describe("Invalid enum rejection", () => {
    it("should reject invalid updateType", async () => {
      const progressData = {
        cycleId,
        fieldAgentId,
        updateType: "invalid_type",
        visitDate: new Date(),
      };

      const progressUpdate = new ProgressUpdate(progressData);
      await expect(progressUpdate.save()).rejects.toThrow();
    });
  });

  describe("Required field validation", () => {
    it("should require cycleId", async () => {
      const progressData = {
        fieldAgentId,
        updateType: "health_check",
        visitDate: new Date(),
      };

      const progressUpdate = new ProgressUpdate(progressData);
      await expect(progressUpdate.save()).rejects.toThrow(/cycleId.*required/i);
    });

    it("should require fieldAgentId", async () => {
      const progressData = {
        cycleId,
        updateType: "health_check",
        visitDate: new Date(),
      };

      const progressUpdate = new ProgressUpdate(progressData);
      await expect(progressUpdate.save()).rejects.toThrow(/fieldAgentId.*required/i);
    });

    it("should require updateType", async () => {
      const progressData = {
        cycleId,
        fieldAgentId,
        visitDate: new Date(),
      };

      const progressUpdate = new ProgressUpdate(progressData);
      await expect(progressUpdate.save()).rejects.toThrow(/updateType.*required/i);
    });

    it("should require visitDate", async () => {
      const progressData = {
        cycleId,
        fieldAgentId,
        updateType: "health_check",
      };

      const progressUpdate = new ProgressUpdate(progressData);
      await expect(progressUpdate.save()).rejects.toThrow(/visitDate.*required/i);
    });
  });
});
