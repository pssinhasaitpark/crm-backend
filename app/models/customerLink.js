//app/models/customerLink.js
import mongoose from "mongoose";

const customerLinkSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true },
      role: { type: String, enum: ["channel_partner"], required: true },
    },
    isUsed: { type: Boolean, default: false },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

export default mongoose.model("CustomerLink", customerLinkSchema);
