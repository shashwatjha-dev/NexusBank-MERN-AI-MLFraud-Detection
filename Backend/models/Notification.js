import mongoose from "mongoose";
import { NOTIFICATION_PRIORITY } from "../utils/enums.js";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 140,
    },

    body: {
      type: String,
      default: "",
      maxlength: 500,
    },

    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITY),
      default: NOTIFICATION_PRIORITY.INFO,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  user: 1,
  read: 1,
  createdAt: -1,
});

notificationSchema.index({
  user: 1,
  createdAt: -1,
});

notificationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Notification", notificationSchema);