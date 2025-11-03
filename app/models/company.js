// app/models/company.js
import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    companyID: { type: String, unique: true },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate companyID before saving
companySchema.pre("save", async function (next) {
  if (this.companyID) return next(); // skip if already set manually

  try {
    const lastCompany = await mongoose
      .model("Company")
      .findOne({}, { companyID: 1 })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastCompany || !lastCompany.companyID) {
      this.companyID = "C-101";
    } else {
      const lastNumber = parseInt(lastCompany.companyID.split("-")[1]);
      this.companyID = `C-${lastNumber + 1}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Company", companySchema);
