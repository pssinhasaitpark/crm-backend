//app/models/followUp.js
import mongoose from "mongoose";
import { type } from "os";

const followUpItemSchema = new mongoose.Schema(
  {
    task: { type: String, required: true },
    notes: { type: String },
    follow_up_date: { type: String, required: true }, // store as string (DD/MM/YYYY)
    call_status: {type: String, enum: [ "connected", "not connected"], required: true},
    added_by: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      role: String,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const followUpSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
    unique: true, // one document per customer
  },
  follow_ups: [followUpItemSchema],
});

export default mongoose.model("FollowUp", followUpSchema);
