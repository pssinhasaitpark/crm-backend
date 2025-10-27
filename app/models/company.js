// app/models/company.js
import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
