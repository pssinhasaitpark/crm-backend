// app/models/associateLink.js
import mongoose from "mongoose";

const associateLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  purpose: {
    type: String,
    enum: ["associate_registration", "customer_registration"],
    required: false,
  },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // expires in 7 days
}, { timestamps: true });

export default mongoose.model("AssociateLink", associateLinkSchema);
