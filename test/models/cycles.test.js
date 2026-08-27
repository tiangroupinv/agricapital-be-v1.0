const mongoose = require("mongoose");
const Cycle = require("../../src/modules/cycles/cycles.model");
const User = require("../../src/modules/users/users.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("Cycle Model", () => {
  let farmerId;
  let fieldAgentId;

  beforeEach(async () => {
    await clearDatabase();

    // Create a farmer
    const farmer = await new User({
      role: "farmer",
      fullName: "Test Farmer",
      email: "farmer@example.com",
      phone: "+250788000100",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678001",
      farmerProfile: {
        location: "Musanze District",
        farmType: "livestock",
      },
    }).save();
    farmerId = farmer._id;

    // Create a field agent
    const fieldAgent = await new User({
      role: "field_agent",
      fullName: "Test Field Agent",
      email: "fieldagent@example.com",
      phone: "+250788000101",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678002",
    }).save();
    fieldAgentId = fieldAgent._id;
  });

  describe("Valid document creation", () => {
    it("should create a valid crop cycle", async () => {
      const cycleData = {
        farmerId,
        fieldAgentIds: [fieldAgentId],
        type: "crop",
        purpose: "seeds",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      const savedCycle = await cycle.save();

      expect(savedCycle._id).toBeDefined();
      expect(savedCycle.type).toBe("crop");
      expect(savedCycle.purpose).toBe("seeds");
      expect(savedCycle.targetAmount).toBe(1000000);
      expect(savedCycle.fundedAmount).toBe(0);
      expect(savedCycle.status).toBe("draft");
    });

    it("should create a valid livestock cycle with embedded off-taker agreement", async () => {
      const cycleData = {
        farmerId,
        type: "livestock",
        purpose: "feeds",
        targetAmount: 2000000,
        status: "approved",
        location: "Musanze District",
        offTakerAgreement: {
          buyerName: "Kigali Serena Hotel",
          buyerType: "hotel",
          product: "Fresh milk",
          pricePerUnit: 400,
          quantity: 5000,
          contractReference: "AGR-OT-2026-014",
        },
      };

      const cycle = new Cycle(cycleData);
      const savedCycle = await cycle.save();

      expect(savedCycle._id).toBeDefined();
      expect(savedCycle.type).toBe("livestock");
      expect(savedCycle.offTakerAgreement.buyerName).toBe("Kigali Serena Hotel");
      expect(savedCycle.offTakerAgreement.buyerType).toBe("hotel");
    });

    it("should create a cycle with embedded insurance and claims", async () => {
      const cycleData = {
        farmerId,
        type: "livestock",
        purpose: "vaccines",
        targetAmount: 500000,
        status: "in_progress",
        location: "Musanze District",
        insurance: {
          naisCovered: true,
          policyReference: "NAIS-2026-0088",
          insurerName: "SORAS Insurance",
          coverageStartDate: new Date("2026-11-01"),
          coverageEndDate: new Date("2027-02-01"),
          claims: [
            {
              incidentType: "disease",
              description: "Suspected mastitis in 2 cows",
              reportedBy: fieldAgentId,
              claimStatus: "filed",
            },
          ],
        },
      };

      const cycle = new Cycle(cycleData);
      const savedCycle = await cycle.save();

      expect(savedCycle._id).toBeDefined();
      expect(savedCycle.insurance.naisCovered).toBe(true);
      expect(savedCycle.insurance.policyReference).toBe("NAIS-2026-0088");
      expect(savedCycle.insurance.claims).toHaveLength(1);
      expect(savedCycle.insurance.claims[0].incidentType).toBe("disease");
      expect(savedCycle.insurance.claims[0].claimStatus).toBe("filed");
    });
  });

  describe("Invalid enum rejection", () => {
    it("should reject invalid cycle type", async () => {
      const cycleData = {
        farmerId,
        type: "invalid_type",
        purpose: "feeds",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });

    it("should reject invalid purpose", async () => {
      const cycleData = {
        farmerId,
        type: "crop",
        purpose: "invalid_purpose",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });

    it("should reject invalid status", async () => {
      const cycleData = {
        farmerId,
        type: "crop",
        purpose: "seeds",
        targetAmount: 1000000,
        status: "invalid_status",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });

    it("should reject invalid buyerType in offTakerAgreement", async () => {
      const cycleData = {
        farmerId,
        type: "livestock",
        purpose: "feeds",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
        offTakerAgreement: {
          buyerType: "invalid_buyer_type",
        },
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });

    it("should reject invalid incidentType in insurance claims", async () => {
      const cycleData = {
        farmerId,
        type: "livestock",
        purpose: "feeds",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
        insurance: {
          claims: [
            {
              incidentType: "invalid_incident",
            },
          ],
        },
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });

    it("should reject invalid claimStatus in insurance claims", async () => {
      const cycleData = {
        farmerId,
        type: "livestock",
        purpose: "feeds",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
        insurance: {
          claims: [
            {
              incidentType: "disease",
              claimStatus: "invalid_status",
            },
          ],
        },
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });
  });

  describe("Required field validation", () => {
    it("should require farmerId", async () => {
      const cycleData = {
        type: "crop",
        purpose: "seeds",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow(/farmerId.*required/i);
    });

    it("should require type", async () => {
      const cycleData = {
        farmerId,
        purpose: "seeds",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow(/type.*required/i);
    });

    it("should require purpose", async () => {
      const cycleData = {
        farmerId,
        type: "crop",
        targetAmount: 1000000,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow(/purpose.*required/i);
    });

    it("should require targetAmount", async () => {
      const cycleData = {
        farmerId,
        type: "crop",
        purpose: "seeds",
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow(/targetAmount.*required/i);
    });

    it("should require location", async () => {
      const cycleData = {
        farmerId,
        type: "crop",
        purpose: "seeds",
        targetAmount: 1000000,
        status: "draft",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow(/location.*required/i);
    });
  });

  describe("Min value validation", () => {
    it("should reject negative targetAmount", async () => {
      const cycleData = {
        farmerId,
        type: "crop",
        purpose: "seeds",
        targetAmount: -100,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });

    it("should reject negative fundedAmount", async () => {
      const cycleData = {
        farmerId,
        type: "crop",
        purpose: "seeds",
        targetAmount: 1000000,
        fundedAmount: -100,
        status: "draft",
        location: "Musanze District",
      };

      const cycle = new Cycle(cycleData);
      await expect(cycle.save()).rejects.toThrow();
    });
  });
});
