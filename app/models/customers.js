// app/models/customers.js
import mongoose from "mongoose";

/*
const customerSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    phone_number: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    personal_phone_number: { type: String, required: true },
     createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, required: true },
      role: { type: String, enum: ["agent", "channel_partner", "admin"], required: true },
    }
  },
  { timestamps: true }
);
*/

const customerSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    phone_number: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    personal_phone_number: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Company ID
    status: { type: String, default: "New" }, // Default to "new" status
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, required: true },
      role: { type: String, enum: ["agent", "channel_partner", "admin"], required: true },
    },
    leadAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Customer", customerSchema);