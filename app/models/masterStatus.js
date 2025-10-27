//app/models/masterStatus.js
import mongoose from 'mongoose';

const masterStatusSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        deleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
)

export default mongoose.model("MasterStatus", masterStatusSchema);