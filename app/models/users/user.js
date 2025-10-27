import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        full_name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        phone_number: { type: String, required: true, unique: true },
        // personal_phone_number: { type: String, required: true },
        location: { type: String, required: true },
        company: { type: String, required: true },
        company_name: { type: String, required: true },
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
            id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
            name: { type: String, default: null },
        },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
