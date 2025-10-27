//app/models/users/associateUsers.js
import mongoose from "mongoose";

const associateUserSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone_number: { type: String, required: true, unique: true },
    location: { type: String, required: true },

    // Auto-inherited from main user
    company: { type: String },
    company_name: { type: String },

    role: {
      type: String,
      enum: ["agent", "channel_partner"],
      required: true,
    },

    password: { type: String, required: true, select: false },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("AssociateUser", associateUserSchema);
