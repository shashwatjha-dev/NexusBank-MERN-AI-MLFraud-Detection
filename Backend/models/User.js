import mongoose from "mongoose";

/**
 * User account (customer or administrator).
 *
 * Notes:
 * - passwordHash is select: false — never returned unless explicitly asked.
 * - accountNumber is the human-visible 12-digit banking account number.
 * - blocked supports administrative freezing without deleting the user.
 * - securityScore is a 0-100 score.
 *
 * Phase 5:
 * - preferences — theme + granular notification opt-ins
 * - address — mailing address sub-doc
 *
 * Profile:
 * - profilePhotoUrl — uploaded profile photo URL
 */

const addressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    line2: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },

    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "India",
    },
  },
  {
    _id: false,
  }
);

const preferencesSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },

    notifyOnLogin: {
      type: Boolean,
      default: true,
    },

    notifyOnTransfer: {
      type: Boolean,
      default: true,
    },

    notifyOnFraud: {
      type: Boolean,
      default: true,
    },

    notifyOnProducts: {
      type: Boolean,
      default: false,
    },

    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Invalid email address.",
      ],
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^[0-9+\-\s()]{7,20}$/,
        "Invalid phone number.",
      ],
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["CUSTOMER", "ADMIN"],
      default: "CUSTOMER",
      index: true,
    },

    accountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED"],
      default: "VERIFIED",
    },

    blocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    securityScore: {
      type: Number,
      default: 92,
      min: 0,
      max: 100,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastFailedLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    /*
     * Profile photo
     *
     * Example:
     * /uploads/profile/profile-123456789.jpg
     */
    profilePhotoUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // Phase 5
    address: {
      type: addressSchema,
      default: () => ({}),
    },

    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
  },

  {
    timestamps: true,

    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;

        return ret;
      },
    },
  }
);

export default mongoose.model(
  "User",
  userSchema
);