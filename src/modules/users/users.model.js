const { model, Schema } = require("mongoose");
const {
  ROLES_LIST,
  KYC_STATUS_LIST,
  PAYMENT_METHODS_LIST,
  FARM_TYPES_LIST,
} = require("../../constants");

/**
 * User Schema
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.1
 */
const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: ROLES_LIST,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    kycStatus: {
      type: String,
      enum: KYC_STATUS_LIST,
      default: "not_required",
    },
    // String, not Number — prevents precision loss and leading-zero loss for ID numbers
    idDocumentNumber: {
      type: String,
      required: true,
    },
    paymentDetails: {
      momoNumber: { type: String },
      bankAccount: { type: String, default: null },
    },
    // Only present if role = "farmer"
    farmerProfile: {
      location: {
        type: String,
        required: function () {
          return this.role === "farmer";
        },
      },
      farmType: {
        type: String,
        enum: FARM_TYPES_LIST,
        required: function () {
          return this.role === "farmer";
        },
      },
      cooperativeName: { type: String },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });

module.exports = model("User", userSchema);
