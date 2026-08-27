const mongoose = require("mongoose");
const User = require("../../src/modules/users/users.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("User Model", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("Valid document creation", () => {
    it("should create a valid investor user", async () => {
      const userData = {
        role: "investor",
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+250788000001",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678901",
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.role).toBe("investor");
      expect(savedUser.fullName).toBe("John Doe");
      expect(savedUser.email).toBe("john@example.com");
      expect(savedUser.kycStatus).toBe("not_required");
      expect(savedUser.isActive).toBe(true);
    });

    it("should create a valid farmer user with farmerProfile", async () => {
      const userData = {
        role: "farmer",
        fullName: "Alice Mukamana",
        email: "alice@example.com",
        phone: "+250788000002",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678902",
        farmerProfile: {
          location: "Musanze District",
          farmType: "livestock",
          cooperativeName: "Musanze Dairy Cooperative",
        },
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.role).toBe("farmer");
      expect(savedUser.farmerProfile.location).toBe("Musanze District");
      expect(savedUser.farmerProfile.farmType).toBe("livestock");
    });

    it("should create a valid field_agent user", async () => {
      const userData = {
        role: "field_agent",
        fullName: "Field Agent User",
        email: "fieldagent@example.com",
        phone: "+250788000003",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678903",
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe("field_agent");
    });

    it("should create a valid admin user", async () => {
      const userData = {
        role: "admin",
        fullName: "Admin User",
        email: "admin@example.com",
        phone: "+250788000004",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678904",
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe("admin");
    });
  });

  describe("Invalid enum rejection", () => {
    it("should reject invalid role", async () => {
      const userData = {
        role: "invalid_role",
        fullName: "Test User",
        email: "test@example.com",
        phone: "+250788000005",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678905",
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it("should reject invalid kycStatus", async () => {
      const userData = {
        role: "investor",
        fullName: "Test User",
        email: "test2@example.com",
        phone: "+250788000006",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678906",
        kycStatus: "invalid_status",
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it("should reject invalid farmType in farmerProfile", async () => {
      const userData = {
        role: "farmer",
        fullName: "Test Farmer",
        email: "farmer@example.com",
        phone: "+250788000007",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678907",
        farmerProfile: {
          location: "Test Location",
          farmType: "invalid_type",
        },
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe("Duplicate key rejection", () => {
    it("should reject duplicate email", async () => {
      const userData1 = {
        role: "investor",
        fullName: "User One",
        email: "duplicate@example.com",
        phone: "+250788000010",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678910",
      };

      const userData2 = {
        role: "investor",
        fullName: "User Two",
        email: "duplicate@example.com", // Same email
        phone: "+250788000011",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678911",
      };

      await new User(userData1).save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow(/duplicate key error/i);
    });

    it("should reject duplicate phone", async () => {
      const userData1 = {
        role: "investor",
        fullName: "User One",
        email: "user1@example.com",
        phone: "+250788000020",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678920",
      };

      const userData2 = {
        role: "investor",
        fullName: "User Two",
        email: "user2@example.com",
        phone: "+250788000020", // Same phone
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678921",
      };

      await new User(userData1).save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow(/duplicate key error/i);
    });
  });

  describe("Required field validation", () => {
    it("should require role", async () => {
      const userData = {
        fullName: "Test User",
        email: "test@example.com",
        phone: "+250788000030",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678930",
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/role.*required/i);
    });

    it("should require fullName", async () => {
      const userData = {
        role: "investor",
        email: "test@example.com",
        phone: "+250788000031",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678931",
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/fullName.*required/i);
    });

    it("should require email", async () => {
      const userData = {
        role: "investor",
        fullName: "Test User",
        phone: "+250788000032",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678932",
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/email.*required/i);
    });

    it("should require phone", async () => {
      const userData = {
        role: "investor",
        fullName: "Test User",
        email: "test@example.com",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678933",
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/phone.*required/i);
    });

    it("should require idDocumentNumber", async () => {
      const userData = {
        role: "investor",
        fullName: "Test User",
        email: "test@example.com",
        phone: "+250788000034",
        passwordHash: "hashedpassword123",
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/idDocumentNumber.*required/i);
    });
  });

  describe("passwordHash select: false", () => {
    it("should not select passwordHash by default", async () => {
      const userData = {
        role: "investor",
        fullName: "Test User",
        email: "pwdtest@example.com",
        phone: "+250788000040",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678940",
      };

      await new User(userData).save();

      const user = await User.findOne({ email: "pwdtest@example.com" });
      expect(user.passwordHash).toBeUndefined();
    });

    it("should select passwordHash when explicitly requested", async () => {
      const userData = {
        role: "investor",
        fullName: "Test User",
        email: "pwdtest2@example.com",
        phone: "+250788000041",
        passwordHash: "hashedpassword123",
        idDocumentNumber: "1198012345678941",
      };

      await new User(userData).save();

      const user = await User.findOne({ email: "pwdtest2@example.com" }).select("+passwordHash");
      expect(user.passwordHash).toBe("hashedpassword123");
    });
  });
});
