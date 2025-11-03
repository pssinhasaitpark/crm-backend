// //app/models/projects.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    project_title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    // price_range: { type: String, required: true }, // stored as string
    min_price: { type: String, required: true },
    max_price: { type: String, required: true },
    images: { type: [String], required: true },
    brouchers: { type: String, required: true },
    projectID: { type: String, unique: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    created_by_role: { type: String, enum: ["admin", "agent", "channel_partner"] },
  },
  { timestamps: true }
);

projectSchema.pre("save", async function (next) {
  if (this.projectID) return next(); // skip if already set

  try {
    const lastProject = await mongoose
      .model("Project")
      .findOne({}, { projectID: 1 })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastProject || !lastProject.projectID) {
      this.projectID = "P-101";
    } else {
      const lastNumber = parseInt(lastProject.projectID.split("-")[1]);
      this.projectID = `P-${lastNumber + 1}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Project", projectSchema);
