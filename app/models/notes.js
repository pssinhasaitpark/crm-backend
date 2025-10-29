//app/models/notes.js
import mongoose from "mongoose";

const noteItemSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    added_by: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      role: String,
    },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
    unique: true,
  },
  notes: [noteItemSchema],
});

export default mongoose.model("Note", noteSchema);

