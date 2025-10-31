// app/models/customers.js
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    phone_number: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, trim: true },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    personal_phone_number: { type: String, required: false },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    status: { type: String, default: "New" },

    isAccepted: { type: Boolean, default: false },

    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String },
      role: { type: String, enum: ["agent", "channel_partner", "admin"] },
    },

    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    is_broadcasted: { type: Boolean, default: false },
    broadcasted_to: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    
    status_history: [
  {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    full_name: String,
    role: String,
    status: String,
    updated_at: Date,
  },
],

  },
  { timestamps: true }
);

export default mongoose.model("Customer", customerSchema);
