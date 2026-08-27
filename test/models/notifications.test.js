const mongoose = require("mongoose");
const Notification = require("../../src/modules/notifications/notifications.model");
const User = require("../../src/modules/users/users.model");
const { clearDatabase } = require("../setup/testDatabase");

describe("Notification Model", () => {
  let userId;

  beforeEach(async () => {
    await clearDatabase();

    // Create a user
    const user = await new User({
      role: "investor",
      fullName: "Test Investor",
      email: "investor@example.com",
      phone: "+250788000700",
      passwordHash: "hashedpassword123",
      idDocumentNumber: "1198012345678700",
    }).save();
    userId = user._id;
  });

  describe("Valid document creation", () => {
    it("should create a valid notification", async () => {
      const notificationData = {
        userId,
        type: "investment_confirmed",
        channel: "sms",
        content: "Your investment of 500,000 RWF has been confirmed.",
        status: "pending",
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification._id).toBeDefined();
      expect(savedNotification.userId.toString()).toBe(userId.toString());
      expect(savedNotification.type).toBe("investment_confirmed");
      expect(savedNotification.channel).toBe("sms");
      expect(savedNotification.content).toBe("Your investment of 500,000 RWF has been confirmed.");
      expect(savedNotification.status).toBe("pending");
    });

    it("should create notification with email channel", async () => {
      const notificationData = {
        userId,
        type: "cycle_completed",
        channel: "email",
        content: "The cycle you invested in has been completed.",
        status: "sent",
      };

      const notification = new Notification(notificationData);
      const savedNotification = await notification.save();

      expect(savedNotification.channel).toBe("email");
      expect(savedNotification.status).toBe("sent");
    });

    it("should create notification for each type", async () => {
      const notificationTypes = [
        "investment_confirmed",
        "disbursement_made",
        "progress_update",
        "cycle_completed",
      ];

      for (const type of notificationTypes) {
        const notificationData = {
          userId,
          type,
          channel: "sms",
          content: `Test notification for ${type}`,
        };

        const notification = new Notification(notificationData);
        const savedNotification = await notification.save();

        expect(savedNotification.type).toBe(type);
      }
    });

    it("should create notification for each channel", async () => {
      const channels = ["email", "sms"];

      for (const channel of channels) {
        const notificationData = {
          userId,
          type: "investment_confirmed",
          channel,
          content: `Test notification via ${channel}`,
        };

        const notification = new Notification(notificationData);
        const savedNotification = await notification.save();

        expect(savedNotification.channel).toBe(channel);
      }
    });
  });

  describe("Invalid enum rejection", () => {
    it("should reject invalid type", async () => {
      const notificationData = {
        userId,
        type: "invalid_type",
        channel: "sms",
        content: "Test content",
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it("should reject invalid channel", async () => {
      const notificationData = {
        userId,
        type: "investment_confirmed",
        channel: "invalid_channel",
        content: "Test content",
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });

    it("should reject invalid status", async () => {
      const notificationData = {
        userId,
        type: "investment_confirmed",
        channel: "sms",
        content: "Test content",
        status: "invalid_status",
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow();
    });
  });

  describe("Required field validation", () => {
    it("should require userId", async () => {
      const notificationData = {
        type: "investment_confirmed",
        channel: "sms",
        content: "Test content",
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow(/userId.*required/i);
    });

    it("should require type", async () => {
      const notificationData = {
        userId,
        channel: "sms",
        content: "Test content",
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow(/type.*required/i);
    });

    it("should require channel", async () => {
      const notificationData = {
        userId,
        type: "investment_confirmed",
        content: "Test content",
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow(/channel.*required/i);
    });

    it("should require content", async () => {
      const notificationData = {
        userId,
        type: "investment_confirmed",
        channel: "sms",
      };

      const notification = new Notification(notificationData);
      await expect(notification.save()).rejects.toThrow(/content.*required/i);
    });
  });
});
