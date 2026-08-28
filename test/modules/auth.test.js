// Set test environment variables BEFORE requiring any modules
process.env.JWT_SECRET = "test-jwt-secret-key-for-auth-testing";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/modules/users/users.model");
const { hashPassword } = require("../../src/utils/hash");
const { signToken } = require("../../src/utils/jwt");
const { clearDatabase } = require("../setup/testDatabase");
const { ROLES } = require("../../src/constants");

describe("Auth Module", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("POST /api/auth/signup", () => {
    const validSignupData = {
      role: "investor",
      fullName: "John Doe",
      email: "john@example.com",
      phone: "+250788000001",
      password: "SecurePass123",
      idDocumentNumber: "1198012345678001",
    };

    it("should create a new investor successfully", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send(validSignupData)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.user.email).toBe(validSignupData.email);
      expect(response.body.data.user.role).toBe("investor");
      expect(response.body.data.token).toBeDefined();
    });

    it("should create a new farmer with farmerProfile", async () => {
      const farmerData = {
        role: "farmer",
        fullName: "Farmer Joe",
        email: "farmer@example.com",
        phone: "+250788000002",
        password: "SecurePass123",
        idDocumentNumber: "1198012345678002",
        farmerProfile: {
          location: "Musanze District",
          farmType: "livestock",
        },
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(farmerData)
        .expect(201);

      expect(response.body.data.user.role).toBe("farmer");
      expect(response.body.data.user.farmerProfile.location).toBe("Musanze District");
    });

    it("should create a new field_agent successfully", async () => {
      const agentData = {
        ...validSignupData,
        role: "field_agent",
        email: "agent@example.com",
        phone: "+250788000003",
        idDocumentNumber: "1198012345678003",
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(agentData)
        .expect(201);

      expect(response.body.data.user.role).toBe("field_agent");
    });

    it("should create a new admin successfully", async () => {
      const adminData = {
        ...validSignupData,
        role: "admin",
        email: "admin@example.com",
        phone: "+250788000004",
        idDocumentNumber: "1198012345678004",
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(adminData)
        .expect(201);

      expect(response.body.data.user.role).toBe("admin");
    });

    it("should reject duplicate email", async () => {
      await request(app).post("/api/auth/signup").send(validSignupData).expect(201);

      const duplicateData = {
        ...validSignupData,
        phone: "+250788000099",
        idDocumentNumber: "1198012345678099",
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(duplicateData)
        .expect(409);

      expect(response.body.message).toBe("Email already registered");
    });

    it("should reject duplicate phone", async () => {
      await request(app).post("/api/auth/signup").send(validSignupData).expect(201);

      const duplicateData = {
        ...validSignupData,
        email: "different@example.com",
        idDocumentNumber: "1198012345678099",
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(duplicateData)
        .expect(409);

      expect(response.body.message).toBe("Phone number already registered");
    });

    it("should hash password before saving", async () => {
      await request(app).post("/api/auth/signup").send(validSignupData).expect(201);

      const user = await User.findOne({ email: validSignupData.email }).select("+passwordHash");
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(validSignupData.password);
    });

    it("should reject invalid role", async () => {
      const invalidData = {
        ...validSignupData,
        role: "invalid_role",
      };

      const response = await request(app)
        .post("/api/auth/signup")
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it("should require all mandatory fields", async () => {
      const requiredFields = ["role", "fullName", "email", "phone", "password", "idDocumentNumber"];

      for (const field of requiredFields) {
        const incompleteData = { ...validSignupData };
        delete incompleteData[field];

        await request(app)
          .post("/api/auth/signup")
          .send(incompleteData)
          .expect(400);
      }
    });
  });

  describe("POST /api/auth/login", () => {
    let user;
    const password = "SecurePass123";
    let passwordHash;

    beforeEach(async () => {
      passwordHash = await hashPassword(password);
      user = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Test User",
        email: "login@example.com",
        phone: "+250788000100",
        passwordHash,
        idDocumentNumber: "1198012345678100",
      });
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: password,
        })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe("login@example.com");
    });

    it("should return 401 for invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "wrong@example.com",
          password: password,
        })
        .expect(401);

      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should return 401 for invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: "WrongPassword123",
        })
        .expect(401);

      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should return 401 for inactive user", async () => {
      await User.findByIdAndUpdate(user._id, { isActive: false });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: password,
        })
        .expect(401);

      expect(response.body.message).toBe("Your account has been deactivated");
    });

    it("should not return passwordHash in response", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: password,
        })
        .expect(200);

      expect(response.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe("GET /api/auth/me", () => {
    let user;
    let token;

    beforeEach(async () => {
      const passwordHash = await hashPassword("SecurePass123");
      user = await User.create({
        role: ROLES.INVESTOR,
        fullName: "Authenticated User",
        email: "me@example.com",
        phone: "+250788000200",
        passwordHash,
        idDocumentNumber: "1198012345678200",
      });
      token = signToken({ userId: user._id, role: user.role });
    });

    it("should return current user for valid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.email).toBe("me@example.com");
      expect(response.body.data.role).toBe("investor");
    });

    it("should return 401 without token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .expect(401);

      expect(response.body.message).toBe("You are not logged in. Please log in to access this resource.");
    });

    it("should return 401 for invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.message).toBe("Invalid token. Please log in again.");
    });
  });
});
